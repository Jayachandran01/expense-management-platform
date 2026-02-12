const { query, run, get } = require('../database/init');

class Transaction {
    /**
     * Create a new transaction
     */
    static async create(transactionData) {
        const {
            user_id,
            category_id,
            type,
            amount,
            description,
            merchant,
            payment_method,
            transaction_date,
            is_recurring,
            tags
        } = transactionData;

        const sql = `
            INSERT INTO transactions (
                user_id, category_id, type, amount, description,
                merchant, payment_method, transaction_date, is_recurring, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            user_id,
            category_id,
            type,
            amount,
            description || '',
            merchant || null,
            payment_method || null,
            transaction_date,
            is_recurring || 0,
            tags ? JSON.stringify(tags) : null
        ];

        const result = await run(sql, params);
        return this.findById(result.id);
    }

    /**
     * Find transaction by ID
     */
    static async findById(id) {
        const sql = `
            SELECT 
                t.*,
                c.name as category_name,
                c.type as category_type,
                c.icon as category_icon,
                c.color as category_color
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id = ?
        `;

        const transaction = await get(sql, [id]);
        if (transaction && transaction.tags) {
            transaction.tags = JSON.parse(transaction.tags);
        }
        return transaction;
    }

    /**
     * Find all transactions by user ID with optional filters
     */
    static async findByUserId(userId, filters = {}) {
        let sql = `
            SELECT 
                t.*,
                c.name as category_name,
                c.type as category_type,
                c.icon as category_icon,
                c.color as category_color
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ?
        `;

        const params = [userId];

        // Apply filters
        if (filters.type) {
            sql += ` AND t.type = ?`;
            params.push(filters.type);
        }

        if (filters.category_id) {
            sql += ` AND t.category_id = ?`;
            params.push(filters.category_id);
        }

        if (filters.start_date) {
            sql += ` AND t.transaction_date >= ?`;
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            sql += ` AND t.transaction_date <= ?`;
            params.push(filters.end_date);
        }

        if (filters.min_amount) {
            sql += ` AND t.amount >= ?`;
            params.push(filters.min_amount);
        }

        if (filters.max_amount) {
            sql += ` AND t.amount <= ?`;
            params.push(filters.max_amount);
        }

        if (filters.search) {
            sql += ` AND (t.description LIKE ? OR t.merchant LIKE ?)`;
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }

        // Sort order
        const sortBy = filters.sort_by || 'transaction_date';
        const sortOrder = filters.sort_order || 'DESC';
        sql += ` ORDER BY t.${sortBy} ${sortOrder}`;

        // Pagination
        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(filters.limit);

            if (filters.offset) {
                sql += ` OFFSET ?`;
                params.push(filters.offset);
            }
        }

        const transactions = await query(sql, params);

        // Parse tags for each transaction
        return transactions.map(t => {
            if (t.tags) {
                t.tags = JSON.parse(t.tags);
            }
            return t;
        });
    }

    /**
     * Update transaction
     */
    static async update(id, userId, updateData) {
        const allowedFields = [
            'category_id', 'type', 'amount', 'description',
            'merchant', 'payment_method', 'transaction_date', 'is_recurring', 'tags'
        ];

        const updates = [];
        const params = [];

        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                if (key === 'tags' && updateData[key]) {
                    params.push(JSON.stringify(updateData[key]));
                } else {
                    params.push(updateData[key]);
                }
            }
        });

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id, userId);

        const sql = `
            UPDATE transactions 
            SET ${updates.join(', ')}
            WHERE id = ? AND user_id = ?
        `;

        await run(sql, params);
        return this.findById(id);
    }

    /**
     * Delete transaction
     */
    static async delete(id, userId) {
        const sql = `DELETE FROM transactions WHERE id = ? AND user_id = ?`;
        const result = await run(sql, [id, userId]);
        return result.changes > 0;
    }

    /**
     * Get transaction count by user
     */
    static async countByUserId(userId, filters = {}) {
        let sql = `SELECT COUNT(*) as count FROM transactions WHERE user_id = ?`;
        const params = [userId];

        if (filters.type) {
            sql += ` AND type = ?`;
            params.push(filters.type);
        }

        if (filters.start_date) {
            sql += ` AND transaction_date >= ?`;
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            sql += ` AND transaction_date <= ?`;
            params.push(filters.end_date);
        }

        const result = await get(sql, params);
        return result.count;
    }

    /**
     * Get total amount by type
     */
    static async getTotalByType(userId, type, startDate, endDate) {
        const sql = `
            SELECT COALESCE(SUM(amount), 0) as total
            FROM transactions
            WHERE user_id = ? AND type = ?
            AND transaction_date BETWEEN ? AND ?
        `;

        const result = await get(sql, [userId, type, startDate, endDate]);
        return parseFloat(result.total);
    }

    /**
     * Get category-wise spending
     */
    static async getCategoryWiseTotal(userId, type, startDate, endDate) {
        const sql = `
            SELECT 
                c.id as category_id,
                c.name as category_name,
                c.icon as category_icon,
                c.color as category_color,
                COALESCE(SUM(t.amount), 0) as total,
                COUNT(t.id) as transaction_count
            FROM categories c
            LEFT JOIN transactions t ON c.id = t.category_id 
                AND t.user_id = ?
                AND t.type = ?
                AND t.transaction_date BETWEEN ? AND ?
            WHERE c.type = ?
            GROUP BY c.id
            HAVING total > 0
            ORDER BY total DESC
        `;

        return await query(sql, [userId, type, startDate, endDate, type]);
    }

    /**
     * Get recent transactions
     */
    static async getRecent(userId, limit = 10) {
        const sql = `
            SELECT 
                t.*,
                c.name as category_name,
                c.type as category_type,
                c.icon as category_icon,
                c.color as category_color
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ?
            ORDER BY t.transaction_date DESC, t.created_at DESC
            LIMIT ?
        `;

        const transactions = await query(sql, [userId, limit]);
        return transactions.map(t => {
            if (t.tags) {
                t.tags = JSON.parse(t.tags);
            }
            return t;
        });
    }
}

module.exports = Transaction;
