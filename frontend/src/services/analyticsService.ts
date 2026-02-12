import apiClient from '../utils/apiClient';
import type {
    FinancialSummary,
    CategoryBreakdown,
    MonthlyTrend,
    Alert,
    Recommendation,
    APIResponse,
} from '../types';

class AnalyticsService {
    /**
     * Get financial summary
     */
    async getFinancialSummary(startDate: string, endDate: string): Promise<FinancialSummary> {
        const response = await apiClient.get<APIResponse<FinancialSummary>>('/analytics/summary', {
            params: { start_date: startDate, end_date: endDate },
        });
        return response.data.data!;
    }

    /**
     * Get category breakdown
     */
    async getCategoryBreakdown(
        type: 'income' | 'expense',
        startDate: string,
        endDate: string
    ): Promise<CategoryBreakdown[]> {
        const response = await apiClient.get<APIResponse<CategoryBreakdown[]>>('/analytics/category-breakdown', {
            params: { type, start_date: startDate, end_date: endDate },
        });
        return response.data.data || [];
    }

    /**
     * Get monthly trend
     */
    async getMonthlyTrend(months: number = 6): Promise<MonthlyTrend[]> {
        const response = await apiClient.get<APIResponse<MonthlyTrend[]>>('/analytics/monthly-trend', {
            params: { months },
        });
        return response.data.data || [];
    }

    /**
     * Get spending patterns
     */
    async getSpendingPatterns(startDate: string, endDate: string): Promise<any[]> {
        const response = await apiClient.get<APIResponse<any[]>>('/analytics/spending-patterns', {
            params: { start_date: startDate, end_date: endDate },
        });
        return response.data.data || [];
    }

    /**
     * Get top spending categories
     */
    async getTopCategories(startDate: string, endDate: string, limit: number = 5): Promise<any[]> {
        const response = await apiClient.get<APIResponse<any[]>>('/analytics/top-categories', {
            params: { start_date: startDate, end_date: endDate, limit },
        });
        return response.data.data || [];
    }

    /**
     * Get budget vs actual comparison
     */
    async getBudgetVsActual(): Promise<any[]> {
        const response = await apiClient.get<APIResponse<any[]>>('/analytics/budget-vs-actual');
        return response.data.data || [];
    }

    /**
     * Get overspending alerts
     */
    async getOverspendingAlerts(): Promise<Alert[]> {
        const response = await apiClient.get<APIResponse<Alert[]>>('/analytics/alerts/overspending');
        return response.data.data || [];
    }

    /**
     * Get budget warnings
     */
    async getBudgetWarnings(): Promise<Alert[]> {
        const response = await apiClient.get<APIResponse<Alert[]>>('/analytics/alerts/budget-warnings');
        return response.data.data || [];
    }

    /**
     * Get spending spike alerts
     */
    async getSpendingSpikes(): Promise<Alert[]> {
        const response = await apiClient.get<APIResponse<Alert[]>>('/analytics/alerts/spending-spikes');
        return response.data.data || [];
    }

    /**
     * Get savings recommendations
     */
    async getRecommendations(startDate: string, endDate: string): Promise<Recommendation[]> {
        const response = await apiClient.get<APIResponse<Recommendation[]>>('/analytics/recommendations', {
            params: { start_date: startDate, end_date: endDate },
        });
        return response.data.data || [];
    }

    /**
     * Get all insights (comprehensive)
     */
    async getAllInsights(startDate: string, endDate: string): Promise<any> {
        const response = await apiClient.get<APIResponse<any>>('/analytics/insights', {
            params: { start_date: startDate, end_date: endDate },
        });
        return response.data.data!;
    }
}

export default new AnalyticsService();
