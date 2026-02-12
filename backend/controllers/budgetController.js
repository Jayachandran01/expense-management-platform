const db = require('../database/connection');
const logger = require('../utils/logger');

exports.getAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const { is_active, budget_type } = req.query;

        let query = db('budgets as b')
            .leftJoin('categories as c', 'b.category_id', 'c.id')
            .where('b.user_id', userId)
            .whereNull('b.deleted_at');

        if (is_active !== undefined) query = query.where('b.is_active', is_active === 'true');
        if (budget_type) query = query.where('b.budget_type', budget_type);

        const budgets = await query
            .select('b.*', 'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color')
            .orderBy('b.created_at', 'desc');

        // Calculate spent for each budget
        for (const budget of budgets) {
            const [{ total }] = await db('transactions')
                .where({ user_id: userId, type: 'expense' })
                .whereNull('deleted_at')
                .where('transaction_date', '>=', budget.start_date)
                .where('transaction_date', '<=', budget.end_date)
                .modify(qb => { if (budget.category_id) qb.where('category_id', budget.category_id); })
                .sum('amount as total');
            budget.spent = parseFloat(total) || 0;
            budget.remaining = parseFloat(budget.amount) - budget.spent;
            budget.percentage_used = budget.amount > 0 ? Math.round((budget.spent / parseFloat(budget.amount)) * 100) : 0;
        }

        res.json({ success: true, data: { budgets } });
    } catch (err) {
        logger.error('Get budgets error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch budgets' } });
    }
};

exports.getById = async (req, res) => {
    try {
        const budget = await db('budgets as b')
            .leftJoin('categories as c', 'b.category_id', 'c.id')
            .where({ 'b.id': req.params.id, 'b.user_id': req.user.id })
            .whereNull('b.deleted_at')
            .select('b.*', 'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color')
            .first();

        if (!budget) return res.status(404).json({ success: false, error: { message: 'Budget not found' } });

        const [{ total }] = await db('transactions')
            .where({ user_id: req.user.id, type: 'expense' })
            .whereNull('deleted_at')
            .where('transaction_date', '>=', budget.start_date)
            .where('transaction_date', '<=', budget.end_date)
            .modify(qb => { if (budget.category_id) qb.where('category_id', budget.category_id); })
            .sum('amount as total');
        budget.spent = parseFloat(total) || 0;
        budget.remaining = parseFloat(budget.amount) - budget.spent;
        budget.percentage_used = budget.amount > 0 ? Math.round((budget.spent / parseFloat(budget.amount)) * 100) : 0;

        res.json({ success: true, data: { budget } });
    } catch (err) {
        logger.error('Get budget error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch budget' } });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, amount, category_id, budget_type, start_date, end_date, alert_threshold } = req.body;
        if (!name || !amount || !start_date || !end_date) {
            return res.status(400).json({ success: false, error: { message: 'Name, amount, start_date and end_date required' } });
        }

        const [budget] = await db('budgets').insert({
            user_id: req.user.id, name, amount: parseFloat(amount),
            category_id: category_id || null, budget_type: budget_type || 'monthly',
            start_date, end_date, alert_threshold: alert_threshold || 80,
        }).returning('*');

        res.status(201).json({ success: true, data: { budget } });
    } catch (err) {
        logger.error('Create budget error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to create budget' } });
    }
};

exports.update = async (req, res) => {
    try {
        const existing = await db('budgets').where({ id: req.params.id, user_id: req.user.id }).whereNull('deleted_at').first();
        if (!existing) return res.status(404).json({ success: false, error: { message: 'Budget not found' } });

        const { name, amount, category_id, budget_type, start_date, end_date, alert_threshold, is_active } = req.body;

        const [updated] = await db('budgets').where({ id: req.params.id }).update({
            name: name || existing.name,
            amount: amount ? parseFloat(amount) : existing.amount,
            category_id: category_id !== undefined ? category_id : existing.category_id,
            budget_type: budget_type || existing.budget_type,
            start_date: start_date || existing.start_date,
            end_date: end_date || existing.end_date,
            alert_threshold: alert_threshold || existing.alert_threshold,
            is_active: is_active !== undefined ? is_active : existing.is_active,
        }).returning('*');

        res.json({ success: true, data: { budget: updated } });
    } catch (err) {
        logger.error('Update budget error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to update budget' } });
    }
};

exports.remove = async (req, res) => {
    try {
        const existing = await db('budgets').where({ id: req.params.id, user_id: req.user.id }).whereNull('deleted_at').first();
        if (!existing) return res.status(404).json({ success: false, error: { message: 'Budget not found' } });
        await db('budgets').where({ id: req.params.id }).update({ deleted_at: new Date() });
        res.json({ success: true, message: 'Budget deleted' });
    } catch (err) {
        logger.error('Delete budget error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to delete budget' } });
    }
};
