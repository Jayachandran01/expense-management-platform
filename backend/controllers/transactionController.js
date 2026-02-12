const db = require('../database/connection');
const logger = require('../utils/logger');

/**
 * GET /api/v1/transactions
 * Supports: pagination, filtering, sorting, search
 */
exports.getAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, type, category_id, start_date, end_date, search, sort_by = 'transaction_date', sort_order = 'desc', data_source, payment_method } = req.query;

        const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(parseInt(limit), 100);
        const perPage = Math.min(parseInt(limit) || 20, 100);

        let query = db('transactions as t')
            .leftJoin('categories as c', 't.category_id', 'c.id')
            .where('t.user_id', userId)
            .whereNull('t.deleted_at');

        // Filters
        if (type) query = query.where('t.type', type);
        if (category_id) query = query.where('t.category_id', category_id);
        if (data_source) query = query.where('t.data_source', data_source);
        if (payment_method) query = query.where('t.payment_method', payment_method);
        if (start_date) query = query.where('t.transaction_date', '>=', start_date);
        if (end_date) query = query.where('t.transaction_date', '<=', end_date);
        if (search) {
            query = query.where(function () {
                this.where('t.description', 'ilike', `%${search}%`)
                    .orWhere('t.merchant', 'ilike', `%${search}%`);
            });
        }

        // Count
        const [{ count }] = await query.clone().count('t.id as count');
        const totalCount = parseInt(count);

        // Sort & paginate
        const allowedSorts = ['transaction_date', 'amount', 'created_at'];
        const sortCol = allowedSorts.includes(sort_by) ? `t.${sort_by}` : 't.transaction_date';
        const transactions = await query
            .select('t.*', 'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color')
            .orderBy(sortCol, sort_order === 'asc' ? 'asc' : 'desc')
            .limit(perPage)
            .offset(offset);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: perPage,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / perPage),
                },
            },
        });
    } catch (err) {
        logger.error('Get transactions error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch transactions' } });
    }
};

/**
 * GET /api/v1/transactions/:id
 */
exports.getById = async (req, res) => {
    try {
        const txn = await db('transactions as t')
            .leftJoin('categories as c', 't.category_id', 'c.id')
            .where({ 't.id': req.params.id, 't.user_id': req.user.id })
            .whereNull('t.deleted_at')
            .select('t.*', 'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color')
            .first();

        if (!txn) return res.status(404).json({ success: false, error: { message: 'Transaction not found' } });

        res.json({ success: true, data: { transaction: txn } });
    } catch (err) {
        logger.error('Get transaction error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch transaction' } });
    }
};

/**
 * POST /api/v1/transactions
 */
exports.create = async (req, res) => {
    try {
        const { type, amount, description, merchant, category_id, transaction_date, payment_method, tags, notes, is_recurring, recurring_frequency, data_source } = req.body;

        if (!type || !amount) {
            return res.status(400).json({ success: false, error: { message: 'Type and amount are required' } });
        }

        const [txn] = await db('transactions').insert({
            user_id: req.user.id,
            type,
            amount: parseFloat(amount),
            description,
            merchant,
            category_id: category_id || null,
            transaction_date: transaction_date || new Date(),
            payment_method: payment_method || 'cash',
            tags: tags || null,
            notes,
            is_recurring: is_recurring || false,
            recurring_frequency,
            data_source: data_source || 'manual',
        }).returning('*');

        // Audit
        await db('audit_logs').insert({
            user_id: req.user.id, action: 'CREATE', entity_type: 'transaction', entity_id: txn.id,
            new_values: JSON.stringify({ amount: txn.amount, type: txn.type, description: txn.description }),
            ip_address: req.ip, request_method: 'POST', request_path: req.originalUrl,
        }).catch(() => { });

        res.status(201).json({ success: true, data: { transaction: txn } });
    } catch (err) {
        logger.error('Create transaction error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to create transaction' } });
    }
};

/**
 * PUT /api/v1/transactions/:id
 */
exports.update = async (req, res) => {
    try {
        const existing = await db('transactions').where({ id: req.params.id, user_id: req.user.id }).whereNull('deleted_at').first();
        if (!existing) return res.status(404).json({ success: false, error: { message: 'Transaction not found' } });

        const { type, amount, description, merchant, category_id, transaction_date, payment_method, tags, notes, is_recurring, recurring_frequency } = req.body;

        const [updated] = await db('transactions')
            .where({ id: req.params.id, user_id: req.user.id })
            .update({
                type: type || existing.type,
                amount: amount ? parseFloat(amount) : existing.amount,
                description: description !== undefined ? description : existing.description,
                merchant: merchant !== undefined ? merchant : existing.merchant,
                category_id: category_id !== undefined ? category_id : existing.category_id,
                transaction_date: transaction_date || existing.transaction_date,
                payment_method: payment_method || existing.payment_method,
                tags: tags || existing.tags,
                notes: notes !== undefined ? notes : existing.notes,
                is_recurring: is_recurring !== undefined ? is_recurring : existing.is_recurring,
                recurring_frequency: recurring_frequency || existing.recurring_frequency,
            }).returning('*');

        res.json({ success: true, data: { transaction: updated } });
    } catch (err) {
        logger.error('Update transaction error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to update transaction' } });
    }
};

/**
 * DELETE /api/v1/transactions/:id (soft delete)
 */
exports.remove = async (req, res) => {
    try {
        const existing = await db('transactions').where({ id: req.params.id, user_id: req.user.id }).whereNull('deleted_at').first();
        if (!existing) return res.status(404).json({ success: false, error: { message: 'Transaction not found' } });

        await db('transactions').where({ id: req.params.id }).update({ deleted_at: new Date() });

        await db('audit_logs').insert({
            user_id: req.user.id, action: 'DELETE', entity_type: 'transaction', entity_id: req.params.id,
            old_values: JSON.stringify({ amount: existing.amount, type: existing.type }),
            ip_address: req.ip, request_method: 'DELETE', request_path: req.originalUrl,
        }).catch(() => { });

        res.json({ success: true, message: 'Transaction deleted' });
    } catch (err) {
        logger.error('Delete transaction error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to delete transaction' } });
    }
};
