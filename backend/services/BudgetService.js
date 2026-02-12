const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

class BudgetService {
    /**
     * Create a new budget with validation
     */
    static async createBudget(userId, budgetData) {
        // Validate dates
        const startDate = new Date(budgetData.start_date);
        const endDate = new Date(budgetData.end_date);

        if (endDate <= startDate) {
            throw new Error('End date must be after start date');
        }

        // Check for overlapping budgets in the same category
        if (budgetData.category_id) {
            const overlapping = await this.checkOverlappingBudgets(
                userId,
                budgetData.category_id,
                budgetData.start_date,
                budgetData.end_date
            );

            if (overlapping) {
                throw new Error('A budget already exists for this category in the specified period');
            }
        }

        const budget = await Budget.create({
            user_id: userId,
            ...budgetData
        });

        return budget;
    }

    /**
     * Check for overlapping budgets
     */
    static async checkOverlappingBudgets(userId, categoryId, startDate, endDate) {
        const { query } = require('../database/init');

        const sql = `
            SELECT id FROM budgets
            WHERE user_id = ?
            AND category_id = ?
            AND is_active = 1
            AND (
                (start_date <= ? AND end_date >= ?)
                OR (start_date <= ? AND end_date >= ?)
                OR (start_date >= ? AND end_date <= ?)
            )
            LIMIT 1
        `;

        const result = await query(sql, [
            userId, categoryId,
            startDate, startDate,
            endDate, endDate,
            startDate, endDate
        ]);

        return result.length > 0;
    }

    /**
     * Get budget progress
     */
    static async getBudgetProgress(budgetId, userId) {
        const budget = await Budget.getBudgetWithSpending(budgetId, userId);

        if (!budget) {
            throw new Error('Budget not found');
        }

        // Calculate days passed and remaining
        const today = new Date();
        const startDate = new Date(budget.start_date);
        const endDate = new Date(budget.end_date);

        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.min(Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)), totalDays);
        const daysRemaining = Math.max(totalDays - daysPassed, 0);

        // Calculate expected vs actual spending
        const expectedSpendingPercentage = (daysPassed / totalDays) * 100;
        const actualSpendingPercentage = budget.percentage_used;

        // Determine if on track
        const onTrack = actualSpendingPercentage <= expectedSpendingPercentage;

        return {
            budget,
            progress: {
                total_days: totalDays,
                days_passed: daysPassed,
                days_remaining: daysRemaining,
                time_progress_percentage: expectedSpendingPercentage,
                spending_progress_percentage: actualSpendingPercentage,
                on_track: onTrack,
                daily_budget: budget.amount / totalDays,
                daily_avg_spending: daysPassed > 0 ? budget.total_spent / daysPassed : 0
            }
        };
    }

    /**
     * Get budget recommendations
     */
    static async getBudgetRecommendations(userId, categoryId, startDate, endDate) {
        // Get historical spending for this category
        const categoryUsage = await require('../models/Category').getCategoryUsage(
            userId,
            categoryId,
            startDate,
            endDate
        );

        const avgSpending = parseFloat(categoryUsage.avg_amount || 0);
        const totalSpending = parseFloat(categoryUsage.total_amount || 0);

        // Calculate recommended budget (120% of average spending for buffer)
        const recommendedBudget = totalSpending * 1.2;

        return {
            category_id: categoryId,
            period: {
                start_date: startDate,
                end_date: endDate
            },
            historical_data: {
                total_spending: totalSpending,
                avg_transaction: avgSpending,
                transaction_count: categoryUsage.transaction_count
            },
            recommended_budget: recommendedBudget,
            confidence: categoryUsage.transaction_count >= 5 ? 'high' : 'low',
            notes: categoryUsage.transaction_count < 5
                ? 'Limited historical data. Recommendation may not be accurate.'
                : 'Based on your spending patterns over the selected period.'
        };
    }

    /**
     * Bulk budget creation helper
     */
    static async createMonthlyBudgets(userId, budgets) {
        const results = [];
        const errors = [];

        for (const budgetData of budgets) {
            try {
                const budget = await this.createBudget(userId, budgetData);
                results.push(budget);
            } catch (error) {
                errors.push({
                    budget: budgetData,
                    error: error.message
                });
            }
        }

        return {
            success: results,
            errors,
            total: budgets.length,
            created: results.length,
            failed: errors.length
        };
    }

    /**
     * Auto-renew expired budgets
     */
    static async renewBudgets(userId) {
        const { query } = require('../database/init');

        // Find budgets that ended in the last month
        const sql = `
            SELECT * FROM budgets
            WHERE user_id = ?
            AND is_active = 1
            AND end_date < date('now')
            AND end_date >= date('now', '-1 month')
            AND budget_type = 'monthly'
        `;

        const expiredBudgets = await query(sql, [userId]);
        const renewed = [];

        for (const budget of expiredBudgets) {
            const newStartDate = new Date(budget.end_date);
            newStartDate.setDate(newStartDate.getDate() + 1);

            const newEndDate = new Date(newStartDate);
            newEndDate.setMonth(newEndDate.getMonth() + 1);
            newEndDate.setDate(newEndDate.getDate() - 1);

            try {
                const newBudget = await Budget.create({
                    user_id: userId,
                    category_id: budget.category_id,
                    budget_type: budget.budget_type,
                    amount: budget.amount,
                    start_date: newStartDate.toISOString().split('T')[0],
                    end_date: newEndDate.toISOString().split('T')[0],
                    alert_threshold: budget.alert_threshold,
                    is_active: 1
                });

                renewed.push(newBudget);
            } catch (error) {
                // Skip if there's an error (e.g., overlapping budget)
                continue;
            }
        }

        return renewed;
    }
}

module.exports = BudgetService;
