const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const VoiceService = require('../services/VoiceService');
const logger = require('../utils/logger');

/**
 * POST /api/v1/voice/process
 * Process a voice transcript
 */
router.post('/process', authMiddleware, async (req, res, next) => {
    try {
        const { transcript } = req.body;

        if (!transcript || transcript.trim().length < 3) {
            return res.status(400).json({ success: false, error: { message: 'Transcript is required (min 3 characters)' } });
        }

        const result = await VoiceService.processTranscript(req.user.id, transcript.trim());

        res.status(200).json({
            success: true,
            message: result.confirmation_required ? 'Parsed successfully — please confirm' : 'Transaction created from voice',
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/voice/confirm
 * Confirm a parsed voice entry
 */
router.post('/confirm', authMiddleware, async (req, res, next) => {
    try {
        const { voice_log_id, ...transactionData } = req.body;

        if (!voice_log_id) {
            return res.status(400).json({ success: false, error: { message: 'voice_log_id is required' } });
        }

        const transaction = await VoiceService.confirmVoiceEntry(req.user.id, voice_log_id, transactionData);

        res.status(201).json({
            success: true,
            message: 'Voice transaction confirmed and saved',
            data: { transaction },
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
