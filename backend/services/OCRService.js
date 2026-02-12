/**
 * OCR Receipt Service
 * Processes receipt images using Tesseract.js (free, open-source)
 * Extracts amount, date, merchant using regex patterns
 */
const db = require('../database/connection');
const AuditService = require('./AuditService');
const AICategoryService = require('./AICategoryService');
const logger = require('../utils/logger');

let Tesseract;
try {
    Tesseract = require('tesseract.js');
} catch {
    logger.warn('tesseract.js not available — OCR features disabled');
}

class OCRService {
    /**
     * Register a receipt upload (before processing)
     */
    static async registerReceipt(userId, file) {
        const receipt = await db('ocr_receipts').insert({
            user_id: userId,
            original_filename: file.originalname,
            stored_path: file.path,
            file_size_bytes: file.size,
            mime_type: file.mimetype,
            processing_status: 'pending',
        }).returning('*');

        return receipt[0];
    }

    /**
     * Process a receipt image with OCR (called by BullMQ worker)
     */
    static async processReceipt(receiptId) {
        const startTime = Date.now();
        const receipt = await db('ocr_receipts').where('id', receiptId).first();
        if (!receipt) throw new Error('Receipt not found');

        try {
            await db('ocr_receipts').where('id', receiptId).update({ processing_status: 'processing' });

            if (!Tesseract) {
                throw new Error('Tesseract.js not installed');
            }

            // Run OCR
            const { data } = await Tesseract.recognize(receipt.stored_path, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });

            const rawText = data.text;
            const ocrConfidence = data.confidence / 100;

            // Extract structured data from OCR text
            const extracted = this.extractReceiptData(rawText);

            // Update receipt with extracted data
            await db('ocr_receipts').where('id', receiptId).update({
                raw_ocr_text: rawText,
                extracted_amount: extracted.amount,
                extracted_date: extracted.date,
                extracted_merchant: extracted.merchant,
                extracted_items: JSON.stringify(extracted.items),
                ocr_confidence: ocrConfidence,
                processing_status: 'extracted',
                processing_time_ms: Date.now() - startTime,
            });

            return {
                receipt_id: receiptId,
                raw_text: rawText,
                extracted: extracted,
                confidence: ocrConfidence,
                status: 'extracted',
            };
        } catch (err) {
            await db('ocr_receipts').where('id', receiptId).update({
                processing_status: 'failed',
                error_message: err.message,
                processing_time_ms: Date.now() - startTime,
            });
            throw err;
        }
    }

    /**
     * Extract structured data from OCR text using regex
     */
    static extractReceiptData(text) {
        const result = { amount: null, date: null, merchant: null, items: [] };

        // Amount extraction (look for total/grand total patterns)
        const amountPatterns = [
            /(?:grand\s*total|total\s*amount|net\s*(?:amount|total)|total|amount\s*due|bill\s*amount)[:\s]*[₹$]?\s*(\d+(?:[,.]?\d+)*)/gi,
            /[₹$]\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/g,
            /(?:inr|rs\.?)\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/gi,
        ];

        let amounts = [];
        for (const pattern of amountPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const num = parseFloat(match[1].replace(/,/g, ''));
                if (num > 0 && num < 10000000) amounts.push(num);
            }
        }
        // Take the largest total amount (most likely the grand total)
        if (amounts.length > 0) result.amount = Math.max(...amounts);

        // Date extraction
        const datePatterns = [
            /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
            /(?:date|dt)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    let day, month, year;
                    if (match[0].startsWith(match[1]) && match[1].length === 4) {
                        // YYYY-MM-DD format
                        year = parseInt(match[1]);
                        month = parseInt(match[2]) - 1;
                        day = parseInt(match[3]);
                    } else {
                        day = parseInt(match[1]);
                        month = parseInt(match[2]) - 1;
                        year = parseInt(match[3]);
                        if (year < 100) year += 2000;
                    }
                    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                        result.date = new Date(year, month, day).toISOString().split('T')[0];
                        break;
                    }
                } catch { /* continue */ }
            }
        }

        // Merchant extraction (usually the first line or prominent text)
        const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
        if (lines.length > 0) {
            // First non-numeric line is usually the merchant name
            for (const line of lines.slice(0, 5)) {
                if (!/^\d+$/.test(line) && !/^(date|time|bill|invoice|receipt|tax|gst)/i.test(line)) {
                    result.merchant = line.substring(0, 100);
                    break;
                }
            }
        }

        // Line items extraction
        const itemPattern = /^(.{3,40})\s+[₹$]?\s*(\d+(?:\.\d{1,2})?)$/gm;
        let itemMatch;
        while ((itemMatch = itemPattern.exec(text)) !== null) {
            const itemName = itemMatch[1].trim();
            const itemPrice = parseFloat(itemMatch[2]);
            if (itemPrice > 0 && itemPrice < result.amount) {
                result.items.push({ name: itemName, price: itemPrice });
            }
        }

        return result;
    }

    /**
     * Confirm receipt and create transaction
     */
    static async confirmReceipt(userId, receiptId, transactionData) {
        const receipt = await db('ocr_receipts').where({ id: receiptId, user_id: userId }).first();
        if (!receipt) throw new Error('Receipt not found');

        // Auto-categorize
        const categoryMatch = await AICategoryService.categorize(userId, transactionData.description || '', transactionData.merchant || receipt.extracted_merchant || '');

        const txn = await db('transactions').insert({
            user_id: userId,
            category_id: transactionData.category_id || categoryMatch.category_id || 1,
            type: transactionData.type || 'expense',
            amount: transactionData.amount || receipt.extracted_amount,
            description: transactionData.description || `Receipt: ${receipt.extracted_merchant || receipt.original_filename}`,
            merchant: transactionData.merchant || receipt.extracted_merchant,
            transaction_date: transactionData.transaction_date || receipt.extracted_date || new Date().toISOString().split('T')[0],
            data_source: 'ocr',
            source_reference_id: receiptId,
            ai_categorized: !!categoryMatch.category_id,
            ai_confidence: categoryMatch.confidence || 0,
        }).returning('*');

        await db('ocr_receipts').where('id', receiptId).update({
            processing_status: 'confirmed',
            resulting_txn_id: txn[0].id,
        });

        await AuditService.log({
            userId,
            action: 'CREATE',
            entityType: 'transaction',
            entityId: txn[0].id,
            newValues: { ...txn[0], source: 'ocr' },
        });

        return txn[0];
    }
}

module.exports = OCRService;
