const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/authMiddleware');
const OCRService = require('../services/OCRService');
const { addJob } = require('../config/queues');
const logger = require('../utils/logger');

// Configure multer for receipt uploads
const receiptStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'receipts'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

const receiptUpload = multer({
    storage: receiptStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
        }
    },
});

/**
 * POST /api/v1/receipts/upload
 * Upload a receipt image for OCR processing
 */
router.post('/upload', authMiddleware, receiptUpload.single('receipt'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { message: 'Receipt image is required' } });
        }

        const receipt = await OCRService.registerReceipt(req.user.id, req.file);

        // Queue OCR processing
        try {
            await addJob('ocrProcessing', `ocr-${receipt.id}`, {
                receiptId: receipt.id,
            });
        } catch {
            // If Redis unavailable, process synchronously
            logger.warn('BullMQ unavailable, processing OCR synchronously...');
            const result = await OCRService.processReceipt(receipt.id);
            return res.status(200).json({ success: true, message: 'Receipt processed', data: result });
        }

        res.status(202).json({
            success: true,
            message: 'Receipt uploaded and queued for OCR processing',
            data: { receipt_id: receipt.id, status: 'processing' },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/receipts/:receiptId
 * Get receipt OCR status/results
 */
router.get('/:receiptId', authMiddleware, async (req, res, next) => {
    try {
        const db = require('../database/connection');
        const receipt = await db('ocr_receipts')
            .where({ id: req.params.receiptId, user_id: req.user.id })
            .first();

        if (!receipt) {
            return res.status(404).json({ success: false, error: { message: 'Receipt not found' } });
        }

        res.status(200).json({ success: true, data: receipt });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/receipts/:receiptId/confirm
 * Confirm extracted data and create transaction
 */
router.post('/:receiptId/confirm', authMiddleware, async (req, res, next) => {
    try {
        const transaction = await OCRService.confirmReceipt(
            req.user.id, req.params.receiptId, req.body
        );

        res.status(201).json({
            success: true,
            message: 'Receipt confirmed and transaction created',
            data: { transaction },
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
