const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { query, get } = require('../database/init');

class AnalyticsService {
    /**
     * Get comprehensive financial summary for a user
     */
    static async getFinancialSummary(userId, startDate, endDate) {
        // Get total income
        const totalIncome = await Transaction.getTotalByType(userId, 'income', startDate, endDate);

        // Get total expenses
        const totalExpenses = await Transaction.getTotalByType(userId, 'expense', startDate, endDate);

        // Calculate savings
        const netSavings = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

        // Get transaction counts
        const incomeCount = await Transaction.countByUserId(userId, {
            type: 'income',
            start_date: startDate,
            end_date: endDate
        });

        const expenseCount = await Transaction.countByUserId(userId, {
            type: 'expense',
            start_date: startDate,
            end_date: endDate
        });

        return {
            period: {
                start_date: startDate,
                end_date: endDate
            },
            income: {
                total: totalIncome,
                count: incomeCount,
                average: incomeCount > 0 ? totalIncome / incomeCount : 0
            },
            expenses: {
                total: totalExpenses,
                count: expenseCount,
                average: expenseCount > 0 ? totalExpenses / expenseCount : 0
            },
            savings: {
                net: netSavings,
                rate: savingsRate
            },
            balance: totalIncome - totalExpenses
        };
    }

    /**
     * Get category-wise breakdown
     */
    static async getCategoryBreakdown(userId, type, startDate, endDate) {
        const categoryData = await Transaction.getCategoryWiseTotal(userId, type, startDate, endDate);

        const total = categoryData.reduce((sum, cat) => sum + parseFloat(cat.total), 0);

        return categoryData.map(cat => ({
            category_id: cat.category_id,
            category_name: cat.category_name,
            icon: cat.category_icon,
            color: cat.category_color,
            total: parseFloat(cat.total),
            transaction_count: cat.transaction_count,
            percentage: total > 0 ? (parseFloat(cat.total) / total) * 100 : 0
        }));
    }

    /**
     * Get monthly trend analysis
     */
    static async getMonthlyTrend(userId, months = 6) {
        const sql = `
            SELECT 
                strftime('%Y-%m', transaction_date) as month,
                type,
                SUM(amount) as total,
                COUNT(*) as count
            FROM transactions
            WHERE user_id = ?
            AND transaction_date >= date('now', '-${months} months')
            GROUP BY month, type
            ORDER BY month ASC
        `;

        const results = await query(sql, [userId]);

        // Format the data for easy consumption
        const trendData = {};

        results.forEach(row => {
            if (!trendData[row.month]) {
                trendData[row.month] = {
                    month: row.month,
                    income: 0,
                    expenses: 0,
                    income_count: 0,
                    expense_count: 0
                };
            }

            if (row.type === 'income') {
                trendData[row.month].income = parseFloat(row.total);
                trendData[row.month].income_count = row.count;
            } else {
                trendData[row.month].expenses = parseFloat(row.total);
                trendData[row.month].expense_count = row.count;
            }
        });

        // Calculate savings for each month
        Object.values(trendData).forEach(month => {
            month.savings = month.income - month.expenses;
            month.savings_rate = month.income > 0 ? (month.savings / month.income) * 100 : 0;
        });

        return Object.values(trendData);
    }

    /**
     * Get spending patterns by day of week
     */
    static async getSpendingPatternsByDayOfWeek(userId, startDate, endDate) {
        const sql = `
            SELECT 
                CASE CAST(strftime('%w', transaction_date) AS INTEGER)
                    WHEN 0 THEN 'Sunday'
                    WHEN 1 THEN 'Monday'
                    WHEN 2 THEN 'Tuesday'
                    WHEN 3 THEN 'Wednesday'
                    WHEN 4 THEN 'Thursday'
                    WHEN 5 THEN 'Friday'
                    WHEN 6 THEN 'Saturday'
                END as day_of_week,
                strftime('%w', transaction_date) as day_number,
                COUNT(*) as transaction_count,
                AVG(amount) as avg_amount,
                SUM(amount) as total_amount
            FROM transactions
            WHERE user_id = ?
            AND type = 'expense'
            AND transaction_date BETWEEN ? AND ?
            GROUP BY day_number
            ORDER BY day_number
        `;

        const results = await query(sql, [userId, startDate, endDate]);

        return results.map(row => ({
            day_of_week: row.day_of_week,
            transaction_count: row.transaction_count,
            avg_amount: parseFloat(row.avg_amount),
            total_amount: parseFloat(row.total_amount)
        }));
    }

    /**
     * Get top spending categories
     */
    static async getTopSpendingCategories(userId, startDate, endDate, limit = 5) {
        const categoryData = await Transaction.getCategoryWiseTotal(userId, 'expense', startDate, endDate);

        return categoryData
            .sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
            .slice(0, limit)
            .map((cat, index) => ({
                rank: index + 1,
                category_id: cat.category_id,
                category_name: cat.category_name,
                icon: cat.category_icon,
                color: cat.category_color,
                total: parseFloat(cat.total),
                transaction_count: cat.transaction_count
            }));
    }

    /**
     * Get budget vs actual comparison
     */
    static async getBudgetVsActual(userId) {
        const budgets = await Budget.getAllBudgetsWithSpending(userId);

        return budgets.map(budget => ({
            budget_id: budget.id,
            category_name: budget.category_name || 'Overall Budget',
            budget_amount: budget.amount,
            spent_amount: budget.total_spent,
            remaining: budget.remaining,
            percentage_used: budget.percentage_used,
            status: budget.is_exceeded ? 'exceeded' : budget.is_warning ? 'warning' : 'on_track',
            is_exceeded: budget.is_exceeded,
            is_warning: budget.is_warning,
            alert_threshold: budget.alert_threshold
        }));
    }

    /**
     * Detect overspending (Rule 1: Budget exceeded)
     */
    static async detectOverspending(userId) {
        const budgets = await Budget.getAllBudgetsWithSpending(userId);

        return budgets
            .filter(budget => budget.is_exceeded)
            .map(budget => ({
                type: 'overspending',
                severity: 'critical',
                budget_id: budget.id,
                category_name: budget.category_name || 'Overall',
                message: `You've exceeded your ${budget.category_name || 'overall'} budget`,
                budget_amount: budget.amount,
                spent_amount: budget.total_spent,
                over_by: budget.total_spent - budget.amount,
                percentage_exceeded: budget.percentage_used
            }));
    }

    /**
     * Detect budget warnings (Rule 2: 80% threshold crossed)
     */
    static async detectBudgetWarnings(userId) {
        const budgets = await Budget.getAllBudgetsWithSpending(userId);

        return budgets
            .filter(budget => budget.is_warning && !budget.is_exceeded)
            .map(budget => ({
                type: 'budget_warning',
                severity: 'warning',
                budget_id: budget.id,
                category_name: budget.category_name || 'Overall',
                message: `You've used ${budget.percentage_used.toFixed(1)}% of your ${budget.category_name || 'overall'} budget`,
                budget_amount: budget.amount,
                spent_amount: budget.total_spent,
                remaining: budget.remaining,
                percentage_used: budget.percentage_used
            }));
    }

    /**
     * Detect sudden spending spikes (Rule 3: Spending significantly higher than average)
     */
    static async detectSpendingSpikes(userId, days = 7, spikeThreshold = 50) {
        // Get average daily spending over the past 30 days
        const avgSql = `
            SELECT AVG(daily_total) as avg_daily_spending
            FROM (
                SELECT DATE(transaction_date) as date, SUM(amount) as daily_total
                FROM transactions
                WHERE user_id = ?
                AND type = 'expense'
                AND transaction_date >= date('now', '-30 days')
                AND transaction_date < date('now', '-${days} days')
                GROUP BY date
            )
        `;

        const avgResult = await get(avgSql, [userId]);
        const avgDailySpending = parseFloat(avgResult?.avg_daily_spending || 0);

        if (avgDailySpending === 0) {
            return []; // Not enough data
        }

        // Get spending for the last N days
        const recentSql = `
            SELECT 
                DATE(transaction_date) as date,
                SUM(amount) as daily_total,
                COUNT(*) as transaction_count
            FROM transactions
            WHERE user_id = ?
            AND type = 'expense'
            AND transaction_date >= date('now', '-${days} days')
            GROUP BY date
            ORDER BY date DESC
        `;

        const recentSpending = await query(recentSql, [userId]);

        const spikes = recentSpending
            .filter(day => {
                const percentageIncrease = ((parseFloat(day.daily_total) - avgDailySpending) / avgDailySpending) * 100;
                return percentageIncrease >= spikeThreshold;
            })
            .map(day => {
                const percentageIncrease = ((parseFloat(day.daily_total) - avgDailySpending) / avgDailySpending) * 100;
                return {
                    type: 'spending_spike',
                    severity: percentageIncrease >= 100 ? 'critical' : 'warning',
                    date: day.date,
                    message: `Unusual spending detected on ${day.date}`,
                    daily_amount: parseFloat(day.daily_total),
                    avg_daily_amount: avgDailySpending,
                    increase_amount: parseFloat(day.daily_total) - avgDailySpending,
                    percentage_increase: percentageIncrease,
                    transaction_count: day.transaction_count
                };
            });

        return spikes;
    }

    /**
     * Generate savings recommendations
     */
    static async generateSavingsRecommendations(userId, startDate, endDate) {
        const summary = await this.getFinancialSummary(userId, startDate, endDate);
        const topCategories = await this.getTopSpendingCategories(userId, startDate, endDate, 3);

        const recommendations = [];

        // Recommendation 1: Low savings rate
        if (summary.savings.rate < 20 && summary.income.total > 0) {
            recommendations.push({
                type: 'low_savings_rate',
                priority: 'high',
                message: `Your savings rate is ${summary.savings.rate.toFixed(1)}%. Aim for at least 20%.`,
                current_rate: summary.savings.rate,
                target_rate: 20,
                potential_savings: (summary.income.total * 0.2) - summary.savings.net
            });
        }

        // Recommendation 2: High spending in specific categories
        topCategories.forEach((category, index) => {
            const categoryPercentage = (category.total / summary.expenses.total) * 100;

            if (categoryPercentage > 30) {
                recommendations.push({
                    type: 'high_category_spending',
                    priority: 'medium',
                    message: `${category.category_name} accounts for ${categoryPercentage.toFixed(1)}% of your spending. Consider reducing it.`,
                    category_name: category.category_name,
                    amount: category.total,
                    percentage: categoryPercentage,
                    suggested_reduction: category.total * 0.1 // Suggest 10% reduction
                });
            }
        });

        // Recommendation 3: Negative cash flow
        if (summary.savings.net < 0) {
            recommendations.push({
                type: 'negative_cash_flow',
                priority: 'critical',
                message: `You spent $${Math.abs(summary.savings.net).toFixed(2)} more than you earned this period.`,
                deficit: Math.abs(summary.savings.net),
                income: summary.income.total,
                expenses: summary.expenses.total
            });
        }

        return recommendations;
    }

    /**
     * Get all insights for a user (comprehensive analysis)
     */
    static async getAllInsights(userId, startDate, endDate) {
        const [
            summary,
            categoryBreakdown,
            monthlyTrend,
            topCategories,
            budgetVsActual,
            overspending,
            budgetWarnings,
            spendingSpikes,
            savingsRecommendations
        ] = await Promise.all([
            this.getFinancialSummary(userId, startDate, endDate),
            this.getCategoryBreakdown(userId, 'expense', startDate, endDate),
            this.getMonthlyTrend(userId, 6),
            this.getTopSpendingCategories(userId, startDate, endDate, 5),
            this.getBudgetVsActual(userId),
            this.detectOverspending(userId),
            this.detectBudgetWarnings(userId),
            this.detectSpendingSpikes(userId, 7, 50),
            this.generateSavingsRecommendations(userId, startDate, endDate)
        ]);

        return {
            summary,
            category_breakdown: categoryBreakdown,
            monthly_trend: monthlyTrend,
            top_categories: topCategories,
            budget_vs_actual: budgetVsActual,
            alerts: {
                overspending,
                budget_warnings,
                spending_spikes
            },
            recommendations: savingsRecommendations
        };
    }
}

module.exports = AnalyticsService;
