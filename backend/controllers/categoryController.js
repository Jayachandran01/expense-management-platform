const db = require('../database/connection');
const logger = require('../utils/logger');

exports.getAll = async (req, res) => {
    try {
        const { type } = req.query;
        let query = db('categories').where(function () {
            this.where('is_system', true).orWhere('user_id', req.user.id);
        });
        if (type) query = query.where('type', type);
        const categories = await query.orderBy('name', 'asc');
        res.json({ success: true, data: { categories } });
    } catch (err) {
        logger.error('Get categories error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch categories' } });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, type, icon, color } = req.body;
        if (!name || !type) return res.status(400).json({ success: false, error: { message: 'Name and type required' } });

        const [category] = await db('categories').insert({
            user_id: req.user.id, name, type, icon: icon || '📦', color: color || '#6366f1',
        }).returning('*');

        res.status(201).json({ success: true, data: { category } });
    } catch (err) {
        logger.error('Create category error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to create category' } });
    }
};

exports.update = async (req, res) => {
    try {
        const existing = await db('categories').where({ id: req.params.id, user_id: req.user.id }).first();
        if (!existing) return res.status(404).json({ success: false, error: { message: 'Category not found' } });

        const { name, icon, color } = req.body;
        const [updated] = await db('categories').where({ id: req.params.id }).update({
            name: name || existing.name, icon: icon || existing.icon, color: color || existing.color,
        }).returning('*');

        res.json({ success: true, data: { category: updated } });
    } catch (err) {
        logger.error('Update category error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to update category' } });
    }
};

exports.remove = async (req, res) => {
    try {
        const existing = await db('categories').where({ id: req.params.id, user_id: req.user.id }).first();
        if (!existing) return res.status(404).json({ success: false, error: { message: 'Category not found' } });
        if (existing.is_system) return res.status(403).json({ success: false, error: { message: 'Cannot delete system category' } });

        await db('categories').where({ id: req.params.id }).del();
        res.json({ success: true, message: 'Category deleted' });
    } catch (err) {
        logger.error('Delete category error:', err.message);
        res.status(500).json({ success: false, error: { message: 'Failed to delete category' } });
    }
};
