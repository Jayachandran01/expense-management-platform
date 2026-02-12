/**
 * CSV Import Service
 * Handles CSV file validation, header mapping, and bulk transaction import
 */
const db = require('../database/connection');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const crypto = require('crypto');
const AuditService = require('./AuditService');
const AICategoryService = require('./AICategoryService');
const logger = require('../utils/logger');

class CSVImportService {
    // Known bank CSV header patterns
    static HEADER_MAPPINGS = {
        date: ['date', 'transaction date', 'txn date', 'value date', 'posting date', 'trans date'],
        amount: ['amount', 'transaction amount', 'txn amount', 'value'],
        debit: ['debit', 'withdrawal', 'debit amount', 'dr'],
        credit: ['credit', 'deposit', 'credit amount', 'cr'],
        description: ['description', 'narration', 'particulars', 'details', 'remarks', 'transaction details', 'memo'],
        merchant: ['merchant', 'payee', 'beneficiary', 'paid to', 'receiver'],
        category: ['category', 'type', 'head', 'transaction type'],
    };

    /**
     * Validate and preview a CSV file
     */
    static async validateAndPreview(userId, filePath, originalFilename) {
        return new Promise((resolve, reject) => {
            const rows = [];
            const headers = [];
            let rowCount = 0;

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('headers', (h) => {
                    headers.push(...h);
                })
                .on('data', (row) => {
                    rowCount++;
                    if (rows.length < 5) rows.push(row);
                })
                .on('end', async () => {
                    try {
                        // Auto-detect column mapping
                        const mapping = this.detectColumnMapping(headers);

                        // Create import log entry
                        const stats = fs.statSync(filePath);
                        const importLog = await db('csv_import_logs').insert({
                            user_id: userId,
                            original_filename: originalFilename,
                            stored_path: filePath,
                            file_size_bytes: stats.size,
                            total_rows: rowCount,
                            column_mapping: JSON.stringify(mapping),
                            processing_status: 'validating',
                        }).returning('*');

                        resolve({
                            import_id: importLog[0].id,
                            total_rows: rowCount,
                            headers,
                            detected_mapping: mapping,
                            preview_rows: rows.slice(0, 5).map((row) => this.applyMapping(row, mapping)),
                            status: 'awaiting_confirmation',
                        });
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('error', reject);
        });
    }

    /**
     * Detect column mappings from headers
     */
    static detectColumnMapping(headers) {
        const mapping = {};
        const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

        for (const [field, patterns] of Object.entries(this.HEADER_MAPPINGS)) {
            for (let i = 0; i < normalizedHeaders.length; i++) {
                if (patterns.includes(normalizedHeaders[i])) {
                    mapping[field] = headers[i]; // Use original header name
                    break;
                }
            }
        }

        return mapping;
    }

    /**
     * Apply column mapping to a row
     */
    static applyMapping(row, mapping) {
        const mapped = {};
        if (mapping.date) mapped.date = row[mapping.date];
        if (mapping.amount) mapped.amount = row[mapping.amount];
        if (mapping.debit) mapped.debit = row[mapping.debit];
        if (mapping.credit) mapped.credit = row[mapping.credit];
        if (mapping.description) mapped.description = row[mapping.description];
        if (mapping.merchant) mapped.merchant = row[mapping.merchant];
        if (mapping.category) mapped.category = row[mapping.category];
        return mapped;
    }

    /**
     * Process CSV import (called by BullMQ worker)
     */
    static async processImport(importId, userId, onProgress) {
        const importLog = await db('csv_import_logs').where('id', importId).first();
        if (!importLog) throw new Error('Import not found');

        const mapping = typeof importLog.column_mapping === 'string'
            ? JSON.parse(importLog.column_mapping) : importLog.column_mapping;

        await db('csv_import_logs').where('id', importId).update({
            processing_status: 'processing',
            started_at: new Date(),
        });

        let imported = 0, skipped = 0, failed = 0, duplicate = 0;
        const errors = [];
        const batch = [];
        const BATCH_SIZE = 100;

        return new Promise((resolve, reject) => {
            let rowNum = 0;

            fs.createReadStream(importLog.stored_path)
                .pipe(csv())
                .on('data', async (row) => {
                    rowNum++;
                    const mapped = this.applyMapping(row, mapping);

                    try {
                        // Parse amount
                        let amount = 0;
                        let type = 'expense';

                        if (mapped.debit && mapped.credit) {
                            const debit = parseFloat(String(mapped.debit).replace(/[,₹$]/g, '')) || 0;
                            const credit = parseFloat(String(mapped.credit).replace(/[,₹$]/g, '')) || 0;
                            if (credit > 0) { amount = credit; type = 'income'; }
                            else if (debit > 0) { amount = debit; type = 'expense'; }
                        } else if (mapped.amount) {
                            amount = parseFloat(String(mapped.amount).replace(/[,₹$]/g, ''));
                            if (amount < 0) { amount = Math.abs(amount); type = 'expense'; }
                            else { type = amount > 0 ? 'income' : 'expense'; }
                        }

                        if (!amount || amount <= 0) {
                            failed++;
                            errors.push({ row: rowNum, error: 'Invalid or missing amount' });
                            return;
                        }

                        // Parse date
                        const dateStr = mapped.date || '';
                        const parsedDate = this.parseDate(dateStr);
                        if (!parsedDate) {
                            failed++;
                            errors.push({ row: rowNum, error: `Invalid date format: ${dateStr}` });
                            return;
                        }

                        // Duplicate check via hash
                        const hash = crypto.createHash('sha256')
                            .update(`${userId}:${parsedDate}:${amount}:${mapped.description || ''}`)
                            .digest('hex');

                        const existing = await db('transactions')
                            .where('user_id', userId)
                            .where('transaction_date', parsedDate)
                            .where('amount', amount)
                            .where('description', mapped.description || 'CSV Import')
                            .whereNull('deleted_at')
                            .first();

                        if (existing) {
                            duplicate++;
                            skipped++;
                            return;
                        }

                        // Auto-categorize
                        const categoryMatch = await AICategoryService.categorize(userId, mapped.description || '', mapped.merchant || '');

                        batch.push({
                            user_id: userId,
                            category_id: categoryMatch.category_id || 1,
                            type,
                            amount,
                            description: (mapped.description || 'CSV Import').substring(0, 500),
                            merchant: mapped.merchant?.substring(0, 100) || null,
                            transaction_date: parsedDate,
                            data_source: 'csv_import',
                            source_reference_id: importId,
                            ai_categorized: !!categoryMatch.category_id,
                            ai_confidence: categoryMatch.confidence || 0,
                        });

                        // Batch insert every BATCH_SIZE rows
                        if (batch.length >= BATCH_SIZE) {
                            await db('transactions').insert([...batch]);
                            imported += batch.length;
                            batch.length = 0;

                            // Update progress
                            if (onProgress) {
                                onProgress({ imported, skipped, failed, duplicate, total: importLog.total_rows });
                            }
                            await db('csv_import_logs').where('id', importId).update({ imported_rows: imported, skipped_rows: skipped, failed_rows: failed, duplicate_rows: duplicate });
                        }
                    } catch (err) {
                        failed++;
                        errors.push({ row: rowNum, error: err.message });
                    }
                })
                .on('end', async () => {
                    try {
                        // Insert remaining batch
                        if (batch.length > 0) {
                            await db('transactions').insert(batch);
                            imported += batch.length;
                        }

                        // Final update
                        await db('csv_import_logs').where('id', importId).update({
                            processing_status: 'completed',
                            imported_rows: imported,
                            skipped_rows: skipped,
                            failed_rows: failed,
                            duplicate_rows: duplicate,
                            row_errors: JSON.stringify(errors.slice(0, 100)), // Keep first 100 errors
                            completed_at: new Date(),
                        });

                        await AuditService.log({
                            userId,
                            action: 'CSV_IMPORT',
                            entityType: 'csv_import_log',
                            entityId: importId,
                            newValues: { imported, skipped, failed, duplicate },
                        });

                        resolve({ imported, skipped, failed, duplicate, errors: errors.slice(0, 20) });
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('error', async (err) => {
                    await db('csv_import_logs').where('id', importId).update({
                        processing_status: 'failed',
                        error_message: err.message,
                    });
                    reject(err);
                });
        });
    }

    /**
     * Parse various date formats
     */
    static parseDate(dateStr) {
        if (!dateStr) return null;
        const str = dateStr.trim();

        // Try ISO format
        const iso = new Date(str);
        if (!isNaN(iso.getTime()) && str.includes('-')) return iso.toISOString().split('T')[0];

        // Try DD/MM/YYYY
        const ddmm = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (ddmm) {
            const day = parseInt(ddmm[1]);
            const month = parseInt(ddmm[2]) - 1;
            let year = parseInt(ddmm[3]);
            if (year < 100) year += 2000;
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }

        // Try MM/DD/YYYY (US format)
        const mmdd = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (mmdd) {
            const month = parseInt(mmdd[1]) - 1;
            const day = parseInt(mmdd[2]);
            const year = parseInt(mmdd[3]);
            if (month <= 11 && day <= 31) {
                const d = new Date(year, month, day);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            }
        }

        return null;
    }

    /**
     * Get import status
     */
    static async getImportStatus(importId, userId) {
        return db('csv_import_logs').where({ id: importId, user_id: userId }).first();
    }
}

module.exports = CSVImportService;
