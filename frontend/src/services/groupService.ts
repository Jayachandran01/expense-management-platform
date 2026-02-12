import apiClient from '../utils/apiClient';
import type { Group, GroupExpense, APIResponse } from '../types';

class GroupService {
    /**
     * Get all groups
     */
    async getGroups(): Promise<Group[]> {
        const response = await apiClient.get<APIResponse<Group[]>>('/groups');
        return response.data.data || [];
    }

    /**
     * Get group by ID
     */
    async getGroup(id: number): Promise<Group> {
        const response = await apiClient.get<APIResponse<Group>>(`/groups/${id}`);
        return response.data.data!;
    }

    /**
     * Create new group
     */
    async createGroup(data: { name: string; description?: string }): Promise<Group> {
        const response = await apiClient.post<APIResponse<Group>>('/groups', data);
        return response.data.data!;
    }

    /**
     * Add member to group
     */
    async addMember(groupId: number, email: string): Promise<void> {
        await apiClient.post(`/groups/${groupId}/members`, { email });
    }

    /**
     * Remove member from group
     */
    async removeMember(groupId: number, userId: number): Promise<void> {
        await apiClient.delete(`/groups/${groupId}/members/${userId}`);
    }

    /**
     * Get group expenses
     */
    async getGroupExpenses(groupId: number): Promise<GroupExpense[]> {
        const response = await apiClient.get<APIResponse<GroupExpense[]>>(`/groups/${groupId}/expenses`);
        return response.data.data || [];
    }

    /**
     * Create group expense
     */
    async createExpense(groupId: number, data: any): Promise<GroupExpense> {
        const response = await apiClient.post<APIResponse<GroupExpense>>(`/groups/${groupId}/expenses`, data);
        return response.data.data!;
    }

    /**
     * Settle expense
     */
    async settler(groupId: number, expenseId: number, userId: number): Promise<void> {
        await apiClient.post(`/groups/${groupId}/expenses/${expenseId}/settle`, { user_id: userId });
    }

    /**
     * Get settlement summary
     */
    async getSettlementSummary(groupId: number): Promise<any> {
        const response = await apiClient.get<APIResponse<any>>(`/groups/${groupId}/settlement`);
        return response.data.data!;
    }

    /**
     * Delete group
     */
    async deleteGroup(id: number): Promise<void> {
        await apiClient.delete(`/groups/${id}`);
    }
}

export default new GroupService();
