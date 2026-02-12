/**
 * Forecasting Service
 * Statistical time-series forecasting without paid APIs
 * Uses simple statistical models when Prophet (Python) is not available
 */
const db = require('../database/connection');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

class ForecastService {
    /**
     * Generate spending forecast for a user
     */
    static async generateForecast(userId, horizonMonths = 3) {
        // Check cache first
        const cached = await cache.get(`forecast:${userId}:spending`);
        if (cached) return cached;

        // Check database for valid forecast
        const existing = await db('forecast_results')
            .where({ user_id: userId, forecast_type: 'spending' })
            .where('valid_until', '>', new Date())
            .orderBy('created_at', 'desc')
            .first();

        if (existing) {
            const result = typeof existing.forecast_data === 'string'
                ? JSON.parse(existing.forecast_data) : existing.forecast_data;
            await cache.set(`forecast:${userId}:spending`, result, 86400);
            return result;
        }

        // Generate new forecast
        const history = await this.getHistoricalSpending(userId);

        if (history.length < 30) {
            return { error: 'Insufficient data', message: 'Need at least 30 days of transaction history for forecasting', data: null };
        }

        // Use statistical forecasting (no Python dependency)
        const forecast = this.statisticalForecast(history, horizonMonths);

        // Calculate accuracy metrics on holdout
        const metrics = this.calculateAccuracy(history);

        // Store forecast
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        await db('forecast_results').insert({
            user_id: userId,
            forecast_type: 'spending',
            forecast_data: JSON.stringify(forecast),
            model_used: 'statistical',
            data_points_used: history.length,
            accuracy_metrics: JSON.stringify(metrics),
            forecast_horizon_months: horizonMonths,
            valid_until: validUntil,
        });

        const result = { forecast, metrics, generated_at: new Date(), valid_until: validUntil };
        await cache.set(`forecast:${userId}:spending`, result, 604800); // 7 days

        return result;
    }

    /**
     * Get historical daily spending
     */
    static async getHistoricalSpending(userId) {
        const data = await db('transactions')
            .select(db.raw('transaction_date as ds'))
            .sum('amount as y')
            .where({ user_id: userId, type: 'expense' })
            .whereNull('deleted_at')
            .groupBy('transaction_date')
            .orderBy('transaction_date', 'asc');

        return data.map((d) => ({ ds: d.ds, y: parseFloat(d.y) }));
    }

    /**
     * Statistical forecast using trend decomposition + seasonality
     */
    static statisticalForecast(history, horizonMonths) {
        // Aggregate to monthly
        const monthly = this.aggregateMonthly(history);

        if (monthly.length < 2) {
            const avg = monthly[0]?.total || 0;
            return this.generateMonthlyPredictions(avg, 0, horizonMonths);
        }

        // Calculate trend (linear regression)
        const amounts = monthly.map((m) => m.total);
        const { slope, intercept } = this.linearRegression(amounts);

        // Calculate seasonal factors (month-over-month patterns)
        const seasonalFactors = this.calculateSeasonality(monthly);

        // Generate forecasts
        const n = amounts.length;
        const forecasts = [];

        for (let i = 1; i <= horizonMonths; i++) {
            const trendValue = intercept + slope * (n + i);
            const month = new Date();
            month.setMonth(month.getMonth() + i);
            const monthIndex = month.getMonth();

            const seasonalFactor = seasonalFactors[monthIndex] || 1.0;
            const predicted = Math.max(0, trendValue * seasonalFactor);

            // Confidence interval based on historical variance
            const variance = this.calculateVariance(amounts);
            const stdDev = Math.sqrt(variance);
            const marginOfError = stdDev * 1.5 * Math.sqrt(i); // Wider for further forecasts

            forecasts.push({
                month: month.toISOString().slice(0, 7),
                predicted: Math.round(predicted),
                lower: Math.round(Math.max(0, predicted - marginOfError)),
                upper: Math.round(predicted + marginOfError),
                confidence: Math.max(0.5, 0.95 - (i * 0.1)), // Decreasing confidence over time
            });
        }

        return forecasts;
    }

    /**
     * Aggregate daily data to monthly
     */
    static aggregateMonthly(dailyData) {
        const monthly = {};
        for (const d of dailyData) {
            const monthKey = String(d.ds).slice(0, 7);
            if (!monthly[monthKey]) monthly[monthKey] = { month: monthKey, total: 0, days: 0 };
            monthly[monthKey].total += d.y;
            monthly[monthKey].days++;
        }
        return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
    }

    /**
     * Simple linear regression
     */
    static linearRegression(values) {
        const n = values.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    /**
     * Calculate seasonal factors
     */
    static calculateSeasonality(monthlyData) {
        const factors = {};
        const avgByMonth = {};
        const countByMonth = {};

        const globalAvg = monthlyData.reduce((sum, m) => sum + m.total, 0) / monthlyData.length;

        for (const m of monthlyData) {
            const monthIndex = new Date(m.month + '-01').getMonth();
            if (!avgByMonth[monthIndex]) { avgByMonth[monthIndex] = 0; countByMonth[monthIndex] = 0; }
            avgByMonth[monthIndex] += m.total;
            countByMonth[monthIndex]++;
        }

        for (let i = 0; i < 12; i++) {
            if (countByMonth[i]) {
                factors[i] = (avgByMonth[i] / countByMonth[i]) / globalAvg;
            } else {
                // Festival months get higher factors
                if (i === 9 || i === 10) factors[i] = 1.3; // Oct-Nov (Diwali)
                else if (i === 11) factors[i] = 1.15; // December (year-end)
                else if (i === 0) factors[i] = 0.9; // January (low spending)
                else factors[i] = 1.0;
            }
        }

        return factors;
    }

    /**
     * Calculate variance
     */
    static calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    }

    /**
     * Calculate accuracy metrics on last month holdout
     */
    static calculateAccuracy(history) {
        if (history.length < 60) {
            return { mae: null, mape: null, rmse: null, message: 'Insufficient data for accuracy calculation' };
        }

        const holdoutDays = 30;
        const training = history.slice(0, -holdoutDays);
        const holdout = history.slice(-holdoutDays);

        const trainingMonthly = this.aggregateMonthly(training);
        const amounts = trainingMonthly.map((m) => m.total);
        const { slope, intercept } = this.linearRegression(amounts);

        const predicted = intercept + slope * amounts.length;
        const actual = holdout.reduce((sum, d) => sum + d.y, 0);

        const mae = Math.abs(predicted - actual);
        const mape = actual > 0 ? (mae / actual) * 100 : 0;
        const rmse = Math.sqrt(Math.pow(predicted - actual, 2));

        return { mae: Math.round(mae), mape: Math.round(mape * 10) / 10, rmse: Math.round(rmse) };
    }

    /**
     * Generate monthly predictions helper
     */
    static generateMonthlyPredictions(baseAmount, trend, months) {
        const forecasts = [];
        for (let i = 1; i <= months; i++) {
            const month = new Date();
            month.setMonth(month.getMonth() + i);
            const predicted = Math.round(baseAmount * (1 + trend * i));
            forecasts.push({
                month: month.toISOString().slice(0, 7),
                predicted,
                lower: Math.round(predicted * 0.8),
                upper: Math.round(predicted * 1.2),
                confidence: 0.6,
            });
        }
        return forecasts;
    }

    /**
     * Get category-level forecast
     */
    static async getCategoryForecast(userId, categoryId) {
        const cacheKey = `forecast:${userId}:category:${categoryId}`;
        const cached = await cache.get(cacheKey);
        if (cached) return cached;

        const data = await db('transactions')
            .select(db.raw('transaction_date as ds'))
            .sum('amount as y')
            .where({ user_id: userId, type: 'expense', category_id: categoryId })
            .whereNull('deleted_at')
            .groupBy('transaction_date')
            .orderBy('transaction_date', 'asc');

        if (data.length < 15) {
            return { error: 'Insufficient data for this category', data: null };
        }

        const history = data.map((d) => ({ ds: d.ds, y: parseFloat(d.y) }));
        const forecast = this.statisticalForecast(history, 3);

        await cache.set(cacheKey, forecast, 604800);
        return forecast;
    }
}

module.exports = ForecastService;
