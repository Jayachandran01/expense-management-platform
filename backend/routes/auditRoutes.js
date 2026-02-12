const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const AuditService = require('../services/AuditService');

/**
 * GET /api/v1/audit-logs
 * Get audit logs (admin/auditor only)
 */
router.get('/', authMiddleware, authorize('admin', 'auditor'), async (req, res, next) => {
    try {
        const logs = await AuditService.getLogs({
            userId: req.query.userId,
            action: req.query.action,
            entityType: req.query.entityType,
            entityId: req.query.entityId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
        });

        const total = await AuditService.getCount({
            userId: req.query.userId,
            entityType: req.query.entityType,
        });

        res.status(200).json({
            success: true,
            data: { logs, total, limit: parseInt(req.query.limit) || 50, offset: parseInt(req.query.offset) || 0 },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/audit-logs/my
 * Get current user's own audit logs
 */
router.get('/my', authMiddleware, async (req, res, next) => {
    try {
        const logs = await AuditService.getLogs({
            userId: req.user.id,
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0,
        });

        res.status(200).json({ success: true, data: { logs } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
