const { query, run, get } = require('../database/init');

class Category {
    /**
     * Create a new category
     */
    static async create(categoryData) {
        const {
            name,
            type,
            icon,
            color,
            is_system,
            user_id
        } = categoryData;

        const sql = `
            INSERT INTO categories (name, type, icon, color, is_system, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const params = [
            name,
            type,
            icon || 'default',
            color || '#6366f1',
            is_system || 0,
            user_id || null
        ];

        const result = await run(sql, params);
        return this.findById(result.id);
    }

    /**
     * Find category by ID
     */
    static async findById(id) {
        const sql = `SELECT * FROM categories WHERE id = ?`;
        return await get(sql, [id]);
    }

    /**
     * Find all categories (system + user-specific)
     */
    static async findByUserId(userId, type = null) {
        let sql = `
            SELECT * FROM categories 
            WHERE (is_system = 1 OR user_id = ?)
        `;

        const params = [userId];

        if (type) {
            sql += ` AND type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY is_system DESC, name ASC`;

        return await query(sql, params);
    }

    /**
     * Find system categories only
     */
    static async findSystemCategories(type = null) {
        let sql = `SELECT * FROM categories WHERE is_system = 1`;
        const params = [];

        if (type) {
            sql += ` AND type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY name ASC`;

        return await query(sql, params);
    }

    /**
     * Find user-created categories only
     */
    static async findUserCategories(userId, type = null) {
        let sql = `SELECT * FROM categories WHERE user_id = ?`;
        const params = [userId];

        if (type) {
            sql += ` AND type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY name ASC`;

        return await query(sql, params);
    }

    /**
     * Update category
     */
    static async update(id, userId, updateData) {
        // First check if user owns this category (can't update system categories)
        const category = await this.findById(id);

        if (!category) {
            throw new Error('Category not found');
        }

        if (category.is_system) {
            throw new Error('Cannot update system categories');
        }

        if (category.user_id !== userId) {
            throw new Error('Unauthorized to update this category');
        }

        const allowedFields = ['name', 'icon', 'color', 'type'];
        const updates = [];
        const params = [];

        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                params.push(updateData[key]);
            }
        });

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const sql = `
            UPDATE categories 
            SET ${updates.join(', ')}
            WHERE id = ?
        `;

        await run(sql, params);
        return this.findById(id);
    }

    /**
     * Delete category (only user-created ones)
     */
    static async delete(id, userId) {
        // Check if category exists and is not system category
        const category = await this.findById(id);

        if (!category) {
            throw new Error('Category not found');
        }

        if (category.is_system) {
            throw new Error('Cannot delete system categories');
        }

        if (category.user_id !== userId) {
            throw new Error('Unauthorized to delete this category');
        }

        const sql = `DELETE FROM categories WHERE id = ? AND user_id = ?`;
        const result = await run(sql, [id, userId]);
        return result.changes > 0;
    }

    /**
     * Get category usage statistics
     */
    static async getCategoryUsage(userId, categoryId, startDate, endDate) {
        const sql = `
            SELECT 
                COUNT(*) as transaction_count,
                COALESCE(SUM(amount), 0) as total_amount,
                AVG(amount) as avg_amount,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount
            FROM transactions
            WHERE user_id = ? 
            AND category_id = ?
            AND transaction_date BETWEEN ? AND ?
        `;

        return await get(sql, [userId, categoryId, startDate, endDate]);
    }

    /**
     * Check if category exists by name
     */
    static async existsByName(name, type, userId) {
        const sql = `
            SELECT id FROM categories 
            WHERE LOWER(name) = LOWER(?)
            AND type = ?
            AND (is_system = 1 OR user_id = ?)
            LIMIT 1
        `;

        const result = await get(sql, [name, type, userId]);
        return result !== undefined;
    }
}

module.exports = Category;
