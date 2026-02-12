import apiClient from '../utils/apiClient';
import type { ChatMessage, ChatSession, APIResponse } from '../types';

class ChatbotService {
    /**
     * Send message to chatbot
     */
    async sendMessage(message: string, sessionId?: number): Promise<ChatMessage> {
        const response = await apiClient.post<APIResponse<ChatMessage>>('/chat/message', {
            message,
            session_id: sessionId,
        });
        return response.data.data!;
    }

    /**
     * Get chat sessions
     */
    async getSessions(): Promise<ChatSession[]> {
        const response = await apiClient.get<APIResponse<ChatSession[]>>('/chat/sessions');
        return response.data.data || [];
    }

    /**
     * Create new chat session
     */
    async createSession(title: string = 'New Chat'): Promise<ChatSession> {
        const response = await apiClient.post<APIResponse<ChatSession>>('/chat/sessions', { title });
        return response.data.data!;
    }

    /**
     * Get messages for a session
     */
    async getMessages(sessionId: number, limit: number = 50): Promise<ChatMessage[]> {
        const response = await apiClient.get<APIResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}/messages`, {
            params: { limit },
        });
        return response.data.data || [];
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId: number): Promise<void> {
        await apiClient.delete(`/chat/sessions/${sessionId}`);
    }
}

export default new ChatbotService();
