const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const InsightService = require('../services/InsightService');
const ForecastService = require('../services/ForecastService');

/**
 * GET /api/v1/insights
 */
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const insights = await InsightService.getInsights(req.user.id, {
            type: req.query.type,
            severity: req.query.severity,
            unreadOnly: req.query.unread === 'true',
            limit: parseInt(req.query.limit) || 20,
        });

        res.status(200).json({ success: true, data: { insights } });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/insights/generate
 * Trigger insight generation
 */
router.post('/generate', authMiddleware, async (req, res, next) => {
    try {
        const insights = await InsightService.generateInsights(req.user.id);
        res.status(200).json({ success: true, message: `Generated ${insights.length} insights`, data: { insights } });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/v1/insights/:id/read
 */
router.put('/:id/read', authMiddleware, async (req, res, next) => {
    try {
        await InsightService.markRead(req.params.id, req.user.id);
        res.status(200).json({ success: true, message: 'Insight marked as read' });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/v1/insights/:id/dismiss
 */
router.put('/:id/dismiss', authMiddleware, async (req, res, next) => {
    try {
        await InsightService.dismiss(req.params.id, req.user.id);
        res.status(200).json({ success: true, message: 'Insight dismissed' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/forecasts
 */
router.get('/forecasts', authMiddleware, async (req, res, next) => {
    try {
        const forecast = await ForecastService.generateForecast(
            req.user.id,
            parseInt(req.query.horizon) || 3
        );

        res.status(200).json({ success: true, data: { forecast } });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/forecasts/category/:categoryId
 */
router.get('/forecasts/category/:categoryId', authMiddleware, async (req, res, next) => {
    try {
        const forecast = await ForecastService.getCategoryForecast(req.user.id, parseInt(req.params.categoryId));
        res.status(200).json({ success: true, data: { forecast } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
