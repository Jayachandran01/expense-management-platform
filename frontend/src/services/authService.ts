import apiClient, { setAccessToken } from '../utils/apiClient';
import type { LoginCredentials, RegisterData, User } from '../types';

interface AuthApiResponse {
    success: boolean;
    data: {
        token: string;
        user: User;
    };
}

class AuthService {
    async register(data: RegisterData) {
        const response = await apiClient.post<AuthApiResponse>('/auth/register', data);
        const { token, user } = response.data.data;
        setAccessToken(token);
        localStorage.setItem('user', JSON.stringify(user));
        return { token, user };
    }

    async login(credentials: LoginCredentials) {
        const response = await apiClient.post<AuthApiResponse>('/auth/login', credentials);
        const { token, user } = response.data.data;
        setAccessToken(token);
        localStorage.setItem('user', JSON.stringify(user));
        return { token, user };
    }

    logout(): void {
        setAccessToken(null);
        localStorage.removeItem('user');
        apiClient.post('/auth/logout').catch(() => { });
    }

    getCurrentUser(): User | null {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try { return JSON.parse(userStr); } catch { return null; }
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
}

export default new AuthService();
