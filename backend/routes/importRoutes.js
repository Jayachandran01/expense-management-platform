const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/authMiddleware');
const CSVImportService = require('../services/CSVImportService');
const { addJob } = require('../config/queues');
const logger = require('../utils/logger');

// Configure multer for CSV uploads
const csvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'csv'));
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}.csv`);
    },
});

const csvUpload = multer({
    storage: csvStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
});

/**
 * POST /api/v1/imports/csv/preview
 * Upload and preview a CSV file, return detected mapping
 */
router.post('/csv/preview', authMiddleware, csvUpload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { message: 'CSV file is required' } });
        }

        const preview = await CSVImportService.validateAndPreview(
            req.user.id, req.file.path, req.file.originalname
        );

        res.status(200).json({
            success: true,
            message: 'CSV parsed and ready for import',
            data: preview,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/imports/csv/confirm/:importId
 * Confirm CSV import with column mapping — queues background job
 */
router.post('/csv/confirm/:importId', authMiddleware, async (req, res, next) => {
    try {
        const { importId } = req.params;
        const { column_mapping } = req.body;

        // Update mapping if provided
        if (column_mapping) {
            const db = require('../database/connection');
            await db('csv_import_logs').where({ id: importId, user_id: req.user.id }).update({
                column_mapping: JSON.stringify(column_mapping),
            });
        }

        // Queue background job
        try {
            await addJob('csvImport', `import-${importId}`, {
                importId,
                userId: req.user.id,
            });
        } catch {
            // If Redis/BullMQ unavailable, process synchronously
            logger.warn('BullMQ unavailable, processing CSV synchronously...');
            const result = await CSVImportService.processImport(importId, req.user.id);
            return res.status(200).json({ success: true, message: 'CSV imported (sync)', data: result });
        }

        res.status(202).json({
            success: true,
            message: 'CSV import queued for processing',
            data: { import_id: importId, status: 'processing' },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/imports/csv/:importId/status
 * Get import status
 */
router.get('/csv/:importId/status', authMiddleware, async (req, res, next) => {
    try {
        const status = await CSVImportService.getImportStatus(req.params.importId, req.user.id);
        if (!status) {
            return res.status(404).json({ success: false, error: { message: 'Import not found' } });
        }

        res.status(200).json({ success: true, data: status });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
