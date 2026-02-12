const express = require('express');
const router = express.Router();
const ac = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/summary', ac.getSummary);
router.get('/category-breakdown', ac.getCategoryBreakdown);
router.get('/monthly-trend', ac.getMonthlyTrend);
router.get('/top-merchants', ac.getTopMerchants);

module.exports = router;
