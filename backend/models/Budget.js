const { query, run, get } = require('../database/init');

class Budget {
    /**
     * Create a new budget
     */
    static async create(budgetData) {
        const {
            user_id,
            category_id,
            budget_type,
            amount,
            start_date,
            end_date,
            alert_threshold,
            is_active
        } = budgetData;

        const sql = `
            INSERT INTO budgets (
                user_id, category_id, budget_type, amount,
                start_date, end_date, alert_threshold, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            user_id,
            category_id || null,
            budget_type,
            amount,
            start_date,
            end_date,
            alert_threshold || 80,
            is_active !== undefined ? is_active : 1
        ];

        const result = await run(sql, params);
        return this.findById(result.id);
    }

    /**
     * Find budget by ID
     */
    static async findById(id) {
        const sql = `
            SELECT 
                b.*,
                c.name as category_name,
                c.icon as category_icon,
                c.color as category_color
            FROM budgets b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.id = ?
        `;

        return await get(sql, [id]);
    }

    /**
     * Find all budgets by user ID
     */
    static async findByUserId(userId, filters = {}) {
        let sql = `
            SELECT 
                b.*,
                c.name as category_name,
                c.icon as category_icon,
                c.color as category_color
            FROM budgets b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = ?
        `;

        const params = [userId];

        // Apply filters
        if (filters.is_active !== undefined) {
            sql += ` AND b.is_active = ?`;
            params.push(filters.is_active);
        }

        if (filters.budget_type) {
            sql += ` AND b.budget_type = ?`;
            params.push(filters.budget_type);
        }

        if (filters.category_id) {
            sql += ` AND b.category_id = ?`;
            params.push(filters.category_id);
        }

        sql += ` ORDER BY b.created_at DESC`;

        return await query(sql, params);
    }

    /**
     * Find active budgets for a user
     */
    static async findActiveBudgets(userId) {
        const sql = `
            SELECT 
                b.*,
                c.name as category_name,
                c.icon as category_icon,
                c.color as category_color
            FROM budgets b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = ? 
            AND b.is_active = 1
            AND date('now') BETWEEN b.start_date AND b.end_date
            ORDER BY b.created_at DESC
        `;

        return await query(sql, [userId]);
    }

    /**
     * Update budget
     */
    static async update(id, userId, updateData) {
        const allowedFields = [
            'category_id', 'budget_type', 'amount', 'start_date',
            'end_date', 'alert_threshold', 'is_active'
        ];

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
        params.push(id, userId);

        const sql = `
            UPDATE budgets 
            SET ${updates.join(', ')}
            WHERE id = ? AND user_id = ?
        `;

        await run(sql, params);
        return this.findById(id);
    }

    /**
     * Delete budget
     */
    static async delete(id, userId) {
        const sql = `DELETE FROM budgets WHERE id = ? AND user_id = ?`;
        const result = await run(sql, [id, userId]);
        return result.changes > 0;
    }

    /**
     * Get budget with spending details
     */
    static async getBudgetWithSpending(budgetId, userId) {
        const budget = await this.findById(budgetId);

        if (!budget || budget.user_id !== userId) {
            return null;
        }

        // Get total spending for this budget period
        let spendingSql = `
            SELECT COALESCE(SUM(amount), 0) as total_spent
            FROM transactions
            WHERE user_id = ?
            AND type = 'expense'
            AND transaction_date BETWEEN ? AND ?
        `;

        const spendingParams = [userId, budget.start_date, budget.end_date];

        if (budget.category_id) {
            spendingSql += ` AND category_id = ?`;
            spendingParams.push(budget.category_id);
        }

        const spendingResult = await get(spendingSql, spendingParams);

        budget.total_spent = parseFloat(spendingResult.total_spent);
        budget.remaining = budget.amount - budget.total_spent;
        budget.percentage_used = (budget.total_spent / budget.amount) * 100;
        budget.is_exceeded = budget.total_spent > budget.amount;
        budget.is_warning = budget.percentage_used >= budget.alert_threshold;

        return budget;
    }

    /**
     * Get all budgets with spending for a user
     */
    static async getAllBudgetsWithSpending(userId) {
        const budgets = await this.findActiveBudgets(userId);

        const budgetsWithSpending = await Promise.all(
            budgets.map(async (budget) => {
                let spendingSql = `
                    SELECT COALESCE(SUM(amount), 0) as total_spent
                    FROM transactions
                    WHERE user_id = ?
                    AND type = 'expense'
                    AND transaction_date BETWEEN ? AND ?
                `;

                const spendingParams = [userId, budget.start_date, budget.end_date];

                if (budget.category_id) {
                    spendingSql += ` AND category_id = ?`;
                    spendingParams.push(budget.category_id);
                }

                const spendingResult = await get(spendingSql, spendingParams);

                budget.total_spent = parseFloat(spendingResult.total_spent);
                budget.remaining = budget.amount - budget.total_spent;
                budget.percentage_used = budget.amount > 0 ? (budget.total_spent / budget.amount) * 100 : 0;
                budget.is_exceeded = budget.total_spent > budget.amount;
                budget.is_warning = budget.percentage_used >= budget.alert_threshold;

                return budget;
            })
        );

        return budgetsWithSpending;
    }

    /**
     * Check if budget is exceeded or needs warning
     */
    static async checkBudgetStatus(budgetId, userId) {
        const budget = await this.getBudgetWithSpending(budgetId, userId);

        if (!budget) {
            return null;
        }

        return {
            id: budget.id,
            category_name: budget.category_name,
            is_exceeded: budget.is_exceeded,
            is_warning: budget.is_warning,
            percentage_used: budget.percentage_used,
            remaining: budget.remaining,
            total_spent: budget.total_spent,
            budget_amount: budget.amount
        };
    }
}

module.exports = Budget;
