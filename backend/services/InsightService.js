/**
 * Insight Generation Service
 * Statistical rule-based insight generator — no paid APIs
 * Runs daily via scheduled job + on-demand
 */
const db = require('../database/connection');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

class InsightService {
    /**
     * Generate all insights for a user
     */
    static async generateInsights(userId) {
        const insights = [];

        try {
            const rules = [
                this.checkSpendingSpike,
                this.checkCategoryCreep,
                this.checkSavingsMilestone,
                this.checkBudgetProjection,
                this.checkUnusualTransaction,
                this.checkRecurringDetection,
                this.checkIncomeChange,
            ];

            for (const rule of rules) {
                try {
                    const result = await rule.call(this, userId);
                    if (result) insights.push(...(Array.isArray(result) ? result : [result]));
                } catch (err) {
                    logger.error(`Insight rule error: ${rule.name}`, err.message);
                }
            }

            // Save insights - avoid duplicates
            for (const insight of insights) {
                const existing = await db('ai_insights')
                    .where({ user_id: userId, insight_type: insight.insight_type, title: insight.title })
                    .where('generated_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
                    .first();

                if (!existing) {
                    await db('ai_insights').insert({ user_id: userId, ...insight });
                }
            }

            // Cache invalidation
            await cache.del(`insights:${userId}`);

            return insights;
        } catch (err) {
            logger.error('Insight generation failed:', err);
            throw err;
        }
    }

    /**
     * Rule 1: Spending Spike Detection
     */
    static async checkSpendingSpike(userId) {
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
        const threeWeeksAgo = new Date(now - 21 * 24 * 60 * 60 * 1000);

        const [thisWeek] = await db('transactions')
            .sum('amount as total')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .whereBetween('transaction_date', [weekAgo, now]);

        const [lastWeek] = await db('transactions')
            .sum('amount as total')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .whereBetween('transaction_date', [twoWeeksAgo, weekAgo]);

        const [twoWeeksPrior] = await db('transactions')
            .sum('amount as total')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .whereBetween('transaction_date', [threeWeeksAgo, twoWeeksAgo]);

        const currentSpend = parseFloat(thisWeek?.total) || 0;
        const avgSpend = ((parseFloat(lastWeek?.total) || 0) + (parseFloat(twoWeeksPrior?.total) || 0)) / 2;

        if (avgSpend > 0 && currentSpend > avgSpend * 1.5) {
            const increase = Math.round(((currentSpend - avgSpend) / avgSpend) * 100);
            return {
                insight_type: 'spending_spike',
                title: 'Spending spike this week',
                description: `Your spending this week (₹${Math.round(currentSpend).toLocaleString()}) is ${increase}% higher than your 2-week average (₹${Math.round(avgSpend).toLocaleString()})`,
                severity: currentSpend > avgSpend * 2 ? 'critical' : 'warning',
                metric_value: currentSpend,
                metric_context: JSON.stringify({ current: currentSpend, average: avgSpend, increase_pct: increase }),
                is_actionable: true,
            };
        }
        return null;
    }

    /**
     * Rule 2: Category Creep (spending increasing in a category)
     */
    static async checkCategoryCreep(userId) {
        const insights = [];
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const thisMonth = await db('transactions')
            .select('category_id')
            .sum('amount as total')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .where('transaction_date', '>=', thisMonthStart)
            .groupBy('category_id');

        const lastMonth = await db('transactions')
            .select('category_id')
            .sum('amount as total')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .whereBetween('transaction_date', [lastMonthStart, lastMonthEnd])
            .groupBy('category_id');

        const lastMonthMap = {};
        for (const lm of lastMonth) lastMonthMap[lm.category_id] = parseFloat(lm.total);

        for (const tm of thisMonth) {
            const current = parseFloat(tm.total);
            const previous = lastMonthMap[tm.category_id] || 0;

            if (previous > 0 && current > previous * 1.2) {
                const increase = Math.round(((current - previous) / previous) * 100);
                const category = await db('categories').where('id', tm.category_id).first();

                insights.push({
                    insight_type: 'category_creep',
                    title: `${category?.name || 'Category'} spending increased`,
                    description: `Your ${category?.name || ''} expenses increased by ${increase}% compared to last month (₹${Math.round(previous).toLocaleString()} → ₹${Math.round(current).toLocaleString()})`,
                    severity: 'info',
                    category_id: tm.category_id,
                    metric_value: current,
                    metric_context: JSON.stringify({ current, previous, increase_pct: increase }),
                });
            }
        }
        return insights.slice(0, 3); // Max 3 category creep insights
    }

    /**
     * Rule 3: Savings Milestone
     */
    static async checkSavingsMilestone(userId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [income] = await db('transactions')
            .sum('amount as total')
            .where({ user_id: userId, type: 'income' })
            .whereNull('deleted_at')
            .where('transaction_date', '>=', monthStart);

        const [expense] = await db('transactions')
            .sum('amount as total')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .where('transaction_date', '>=', monthStart);

        const totalIncome = parseFloat(income?.total) || 0;
        const totalExpense = parseFloat(expense?.total) || 0;

        if (totalIncome > 0) {
            const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
            if (savingsRate >= 25) {
                return {
                    insight_type: 'savings_milestone',
                    title: 'Great savings rate! 🎉',
                    description: `You saved ${Math.round(savingsRate)}% of your income this month (₹${Math.round(totalIncome - totalExpense).toLocaleString()}). Keep it up!`,
                    severity: 'info',
                    metric_value: savingsRate,
                    metric_context: JSON.stringify({ income: totalIncome, expense: totalExpense, savings_rate: savingsRate }),
                };
            }
        }
        return null;
    }

    /**
     * Rule 4: Budget Projection
     */
    static async checkBudgetProjection(userId) {
        const insights = [];
        const activeBudgets = await db('budgets')
            .where({ user_id: userId, is_active: true })
            .whereNull('deleted_at');

        for (const budget of activeBudgets) {
            const [spending] = await db('transactions')
                .sum('amount as total')
                .where({ user_id: userId, type: 'expense' })
                .whereNull('deleted_at')
                .whereBetween('transaction_date', [budget.start_date, budget.end_date])
                .modify(function (qb) {
                    if (budget.category_id) qb.where('category_id', budget.category_id);
                });

            const spent = parseFloat(spending?.total) || 0;
            const now = new Date();
            const start = new Date(budget.start_date);
            const end = new Date(budget.end_date);
            const totalDays = Math.max(1, (end - start) / (24 * 60 * 60 * 1000));
            const elapsedDays = Math.max(1, (now - start) / (24 * 60 * 60 * 1000));
            const dailyRate = spent / elapsedDays;
            const projectedTotal = dailyRate * totalDays;

            if (projectedTotal > budget.amount * 1.1 && spent < budget.amount) {
                const category = budget.category_id ? await db('categories').where('id', budget.category_id).first() : null;
                const overBy = Math.round(projectedTotal - parseFloat(budget.amount));

                insights.push({
                    insight_type: 'budget_projection',
                    title: `${category?.name || 'Overall'} budget at risk`,
                    description: `At the current rate, you'll exceed your ${category?.name || 'overall'} budget by ₹${overBy.toLocaleString()}`,
                    severity: 'warning',
                    category_id: budget.category_id,
                    metric_value: projectedTotal,
                    metric_context: JSON.stringify({ spent, budget_amount: budget.amount, projected: projectedTotal, over_by: overBy }),
                    is_actionable: true,
                });
            }
        }
        return insights.slice(0, 3);
    }

    /**
     * Rule 5: Unusual Transaction
     */
    static async checkUnusualTransaction(userId) {
        const recentTxns = await db('transactions')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .orderBy('created_at', 'desc')
            .limit(5);

        const insights = [];
        for (const txn of recentTxns) {
            if (!txn.category_id) continue;

            const [avgResult] = await db('transactions')
                .avg('amount as avg_amount')
                .where({ user_id: userId, type: 'expense', category_id: txn.category_id })
                .whereNull('deleted_at')
                .whereNot('id', txn.id);

            const avgAmount = parseFloat(avgResult?.avg_amount) || 0;
            if (avgAmount > 0 && parseFloat(txn.amount) > avgAmount * 3) {
                const category = await db('categories').where('id', txn.category_id).first();
                insights.push({
                    insight_type: 'unusual_transaction',
                    title: `Unusual ${category?.name || ''} expense`,
                    description: `₹${parseFloat(txn.amount).toLocaleString()} at ${txn.merchant || 'merchant'} is ${Math.round(txn.amount / avgAmount)}x your average ${category?.name || ''} transaction (₹${Math.round(avgAmount).toLocaleString()})`,
                    severity: 'info',
                    category_id: txn.category_id,
                    metric_value: parseFloat(txn.amount),
                    metric_context: JSON.stringify({ amount: txn.amount, average: avgAmount, multiplier: Math.round(txn.amount / avgAmount) }),
                });
            }
        }
        return insights.slice(0, 2);
    }

    /**
     * Rule 6: Recurring Transaction Detection
     */
    static async checkRecurringDetection(userId) {
        const recurring = await db('transactions')
            .select('merchant', 'amount')
            .count('* as occurrences')
            .where({ user_id: userId, type: 'expense', is_recurring: false })
            .whereNull('deleted_at')
            .whereNotNull('merchant')
            .groupBy('merchant', 'amount')
            .having(db.raw('count(*) >= 3'))
            .limit(3);

        return recurring.map((r) => ({
            insight_type: 'recurring_detected',
            title: 'Recurring expense detected',
            description: `${r.merchant} (₹${parseFloat(r.amount).toLocaleString()}) appears ${r.occurrences} times. Want to mark it as recurring?`,
            severity: 'info',
            metric_value: parseFloat(r.amount),
            action_type: 'convert_to_recurring',
            metric_context: JSON.stringify({ merchant: r.merchant, amount: r.amount, occurrences: parseInt(r.occurrences) }),
            is_actionable: true,
        }));
    }

    /**
     * Rule 7: Income Change Detection
     */
    static async checkIncomeChange(userId) {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

        const [thisMonthIncome] = await db('transactions')
            .sum('amount as total')
            .where({ user_id: userId, type: 'income' })
            .whereNull('deleted_at')
            .where('transaction_date', '>=', thisMonthStart);

        const [avgIncome] = await db('transactions')
            .select(db.raw('SUM(amount) / 3 as avg_monthly'))
            .where({ user_id: userId, type: 'income' })
            .whereNull('deleted_at')
            .whereBetween('transaction_date', [threeMonthsAgo, thisMonthStart]);

        const current = parseFloat(thisMonthIncome?.total) || 0;
        const average = parseFloat(avgIncome?.avg_monthly) || 0;

        if (average > 0 && Math.abs(current - average) / average > 0.15) {
            const direction = current > average ? 'higher' : 'lower';
            const change = Math.round(Math.abs(((current - average) / average) * 100));

            return {
                insight_type: 'income_change',
                title: `Income ${direction} than average`,
                description: `Your income this month (₹${Math.round(current).toLocaleString()}) is ${change}% ${direction} than your 3-month average (₹${Math.round(average).toLocaleString()})`,
                severity: 'info',
                metric_value: current,
                metric_context: JSON.stringify({ current, average, change_pct: change, direction }),
            };
        }
        return null;
    }

    /**
     * Get insights for a user (with caching)
     */
    static async getInsights(userId, filters = {}) {
        let query = db('ai_insights')
            .where('user_id', userId)
            .where('is_dismissed', false)
            .orderBy('generated_at', 'desc');

        if (filters.type) query = query.where('insight_type', filters.type);
        if (filters.severity) query = query.where('severity', filters.severity);
        if (filters.unreadOnly) query = query.where('is_read', false);

        return query.limit(filters.limit || 20);
    }

    /**
     * Mark insight as read
     */
    static async markRead(insightId, userId) {
        return db('ai_insights').where({ id: insightId, user_id: userId }).update({ is_read: true, read_at: new Date() });
    }

    /**
     * Dismiss insight
     */
    static async dismiss(insightId, userId) {
        return db('ai_insights').where({ id: insightId, user_id: userId }).update({ is_dismissed: true, dismissed_at: new Date() });
    }
}

module.exports = InsightService;
