import apiClient from '../utils/apiClient';
import type { Budget, BudgetWithSpending, CreateBudgetData, APIResponse } from '../types';

class BudgetService {
    /**
     * Get all budgets
     */
    async getBudgets(params?: { budget_type?: 'monthly' | 'yearly'; is_active?: boolean }): Promise<Budget[]> {
        const response = await apiClient.get<APIResponse<Budget[]>>('/budgets', { params });
        return response.data.data || [];
    }

    /**
     * Get budget by ID
     */
    async getBudget(id: number): Promise<Budget> {
        const response = await apiClient.get<APIResponse<Budget>>(`/budgets/${id}`);
        return response.data.data!;
    }

    /**
     * Create new budget
     */
    async createBudget(data: CreateBudgetData): Promise<Budget> {
        const response = await apiClient.post<APIResponse<Budget>>('/budgets', data);
        return response.data.data!;
    }

    /**
     * Create multiple budgets
     */
    async createBulkBudgets(budgets: CreateBudgetData[]): Promise<Budget[]> {
        const response = await apiClient.post<APIResponse<Budget[]>>('/budgets/bulk', { budgets });
        return response.data.data || [];
    }

    /**
     * Update budget
     */
    async updateBudget(id: number, data: Partial<CreateBudgetData>): Promise<Budget> {
        const response = await apiClient.put<APIResponse<Budget>>(`/budgets/${id}`, data);
        return response.data.data!;
    }

    /**
     * Delete budget
     */
    async deleteBudget(id: number): Promise<void> {
        await apiClient.delete(`/budgets/${id}`);
    }

    /**
     * Get budgets with spending details
     */
    async getBudgetsWithSpending(): Promise<BudgetWithSpending[]> {
        const response = await apiClient.get<APIResponse<BudgetWithSpending[]>>('/budgets/with-spending');
        return response.data.data || [];
    }

    /**
     * Get budget progress
     */
    async getBudgetProgress(id: number): Promise<BudgetWithSpending> {
        const response = await apiClient.get<APIResponse<BudgetWithSpending>>(`/budgets/${id}/progress`);
        return response.data.data!;
    }

    /**
     * Get budget recommendations
     */
    async getBudgetRecommendations(params: {
        category_id?: number;
        start_date: string;
        end_date: string;
    }): Promise<any> {
        const response = await apiClient.get<APIResponse<any>>('/budgets/recommendations', { params });
        return response.data.data!;
    }
}

export default new BudgetService();
