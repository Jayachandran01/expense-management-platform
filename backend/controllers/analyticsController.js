const db = require('../database/connection');
const logger = require('../utils/logger');

/**
 * GET /api/v1/analytics/summary
 */
exports.getSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const { start_date, end_date, period } = req.query;

        let startD, endD;
        const now = new Date();
        if (start_date && end_date) {
            startD = start_date; endD = end_date;
        } else if (period === 'year') {
            startD = `${now.getFullYear()}-01-01`; endD = `${now.getFullYear()}-12-31`;
        } else {
            startD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            endD = now.toISOString().split('T')[0];
        }

        const base = db('transactions').where('user_id', userId).whereNull('deleted_at')
            .where('transaction_date', '>=', startD).where('transaction_date', '<=', endD);

        const [incomeResult] = await base.clone().where('type', 'income').sum('amount as total');
        const [expenseResult] = await base.clone().where('type', 'expense').sum('amount as total');
        const [txnCount] = await base.clone().count('id as count');

        const totalIncome = parseFloat(incomeResult.total) || 0;
        const totalExpense = parseFloat(expenseResult.total) || 0;

        res.json({
            success: true,
            data: {
                summary: {
                    total_income: totalIncome,
                    total_expense: totalExpense,
                    net_savings: totalIncome - totalExpense,
                    savings_rate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
                    transaction_count: parseInt(txnCount.count),
                    period: { start: startD, end: endD },
                },
            },
        });
    } catch (err) {
        logger.error('Analytics summary error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch summary' } });
    }
};

/**
 * GET /api/v1/analytics/category-breakdown
 */
exports.getCategoryBreakdown = async (req, res) => {
    try {
        const userId = req.user.id;
        const { start_date, end_date, type = 'expense' } = req.query;

        const now = new Date();
        const startD = start_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const endD = end_date || now.toISOString().split('T')[0];

        const breakdown = await db('transactions as t')
            .leftJoin('categories as c', 't.category_id', 'c.id')
            .where('t.user_id', userId)
            .where('t.type', type)
            .whereNull('t.deleted_at')
            .where('t.transaction_date', '>=', startD)
            .where('t.transaction_date', '<=', endD)
            .select('c.name as category_name', 'c.icon', 'c.color')
            .sum('t.amount as total')
            .count('t.id as count')
            .groupBy('c.name', 'c.icon', 'c.color')
            .orderBy('total', 'desc');

        const grandTotal = breakdown.reduce((sum, b) => sum + parseFloat(b.total), 0);
        const formatted = breakdown.map(b => ({
            ...b,
            total: parseFloat(b.total),
            count: parseInt(b.count),
            percentage: grandTotal > 0 ? Math.round((parseFloat(b.total) / grandTotal) * 100) : 0,
        }));

        res.json({ success: true, data: { breakdown: formatted, total: grandTotal, period: { start: startD, end: endD } } });
    } catch (err) {
        logger.error('Category breakdown error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch category breakdown' } });
    }
};

/**
 * GET /api/v1/analytics/monthly-trend
 */
exports.getMonthlyTrend = async (req, res) => {
    try {
        const userId = req.user.id;
        const { months = 6 } = req.query;

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const trend = await db('transactions')
            .where('user_id', userId)
            .whereNull('deleted_at')
            .where('transaction_date', '>=', startDate.toISOString().split('T')[0])
            .select(db.raw("TO_CHAR(transaction_date, 'YYYY-MM') as month"), 'type')
            .sum('amount as total')
            .groupBy(db.raw("TO_CHAR(transaction_date, 'YYYY-MM')"), 'type')
            .orderBy('month', 'asc');

        // Pivot into { month, income, expense, net }
        const monthMap = {};
        for (const row of trend) {
            if (!monthMap[row.month]) monthMap[row.month] = { month: row.month, income: 0, expense: 0 };
            monthMap[row.month][row.type] = parseFloat(row.total);
        }

        const data = Object.values(monthMap).map(m => ({
            ...m,
            net: m.income - m.expense,
            savings_rate: m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0,
        }));

        res.json({ success: true, data: { trend: data } });
    } catch (err) {
        logger.error('Monthly trend error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch monthly trend' } });
    }
};

/**
 * GET /api/v1/analytics/top-merchants
 */
exports.getTopMerchants = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10 } = req.query;

        const now = new Date();
        const startD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        const merchants = await db('transactions')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .whereNotNull('merchant')
            .where('transaction_date', '>=', startD)
            .select('merchant')
            .sum('amount as total')
            .count('id as count')
            .groupBy('merchant')
            .orderBy('total', 'desc')
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: { merchants: merchants.map(m => ({ ...m, total: parseFloat(m.total), count: parseInt(m.count) })) },
        });
    } catch (err) {
        logger.error('Top merchants error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch top merchants' } });
    }
};
