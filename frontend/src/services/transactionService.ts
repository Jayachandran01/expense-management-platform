import apiClient from '../utils/apiClient';
import type { Transaction, CreateTransactionData, APIResponse, Category } from '../types';

class TransactionService {
    /**
     * Get all transactions with filters
     */
    async getTransactions(params?: {
        type?: 'income' | 'expense';
        category_id?: number;
        start_date?: string;
        end_date?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<Transaction[]> {
        const response = await apiClient.get<APIResponse<Transaction[]>>('/transactions', { params });
        return response.data.data || [];
    }

    /**
     * Get transaction by ID
     */
    async getTransaction(id: number): Promise<Transaction> {
        const response = await apiClient.get<APIResponse<Transaction>>(`/transactions/${id}`);
        return response.data.data!;
    }

    /**
     * Create new transaction
     */
    async createTransaction(data: CreateTransactionData): Promise<Transaction> {
        const response = await apiClient.post<APIResponse<Transaction>>('/transactions', data);
        return response.data.data!;
    }

    /**
     * Update transaction
     */
    async updateTransaction(id: number, data: Partial<CreateTransactionData>): Promise<Transaction> {
        const response = await apiClient.put<APIResponse<Transaction>>(`/transactions/${id}`, data);
        return response.data.data!;
    }

    /**
     * Delete transaction
     */
    async deleteTransaction(id: number): Promise<void> {
        await apiClient.delete(`/transactions/${id}`);
    }

    /**
     * Get recent transactions
     */
    async getRecentTransactions(limit: number = 5): Promise<Transaction[]> {
        const response = await apiClient.get<APIResponse<Transaction[]>>(`/transactions/recent?limit=${limit}`);
        return response.data.data || [];
    }

    /**
     * Get category-wise totals
     */
    async getCategoryTotals(type: 'income' | 'expense', startDate?: string, endDate?: string): Promise<any[]> {
        const params = { type, start_date: startDate, end_date: endDate };
        const response = await apiClient.get<APIResponse<any[]>>('/transactions/category-totals', { params });
        return response.data.data || [];
    }

    /**
     * Get all categories
     */
    async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
        const params = type ? { type } : {};
        const response = await apiClient.get<APIResponse<Category[]>>('/categories', { params });
        return response.data.data || [];
    }
}

export default new TransactionService();
