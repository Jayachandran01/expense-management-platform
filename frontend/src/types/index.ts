// User types
export interface User {
    id: string | number;
    email: string;
    full_name: string;
    role?: string;
    currency?: string;
    timezone?: string;
    is_active?: boolean;
    is_verified?: boolean;
    created_at: string;
}

export interface AuthResponse {
    success: boolean;
    token: string;
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    full_name: string;
}

// Transaction types
export interface Transaction {
    id: number;
    user_id: number;
    category_id: number;
    category_name?: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    transaction_date: string;
    payment_method?: string;
    receipt_url?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateTransactionData {
    category_id: number;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    transaction_date: string;
    payment_method?: string;
    receipt_url?: string;
}

// Category types
export interface Category {
    id: number;
    name: string;
    type: 'income' | 'expense' | 'both';
    icon?: string;
    color?: string;
    is_system: boolean;
    user_id?: number;
    created_at: string;
}

// Budget types
export interface Budget {
    id: number;
    user_id: number;
    category_id?: number;
    category_name?: string;
    budget_type: 'monthly' | 'yearly';
    amount: number;
    start_date: string;
    end_date: string;
    alert_threshold: number;
    is_active: boolean;
    created_at: string;
}

export interface BudgetWithSpending extends Budget {
    spent_amount: number;
    remaining_amount: number;
    percentage_used: number;
    status: 'on_track' | 'warning' | 'exceeded';
    is_exceeded: boolean;
    is_warning: boolean;
}

export interface CreateBudgetData {
    category_id?: number;
    budget_type: 'monthly' | 'yearly';
    amount: number;
    start_date: string;
    end_date: string;
    alert_threshold?: number;
}

// Analytics types
export interface FinancialSummary {
    income: {
        total: number;
        count: number;
        average: number;
    };
    expenses: {
        total: number;
        count: number;
        average: number;
    };
    balance: number;
    savings: {
        amount: number;
        rate: number;
    };
    period: {
        start_date: string;
        end_date: string;
    };
}

export interface CategoryBreakdown {
    category_id: number;
    category_name: string;
    total: number;
    count: number;
    percentage: number;
    average: number;
}

export interface MonthlyTrend {
    month: string;
    income: number;
    expenses: number;
    savings: number;
    savings_rate: number;
    transaction_count: number;
}

export interface Alert {
    type: 'overspending' | 'budget_warning' | 'spending_spike';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    category?: string;
    amount?: number;
    budget_amount?: number;
    date?: string;
}

export interface Recommendation {
    type: 'savings' | 'budget' | 'spending';
    priority: 'high' | 'medium' | 'low';
    message: string;
    potential_savings?: number;
}

// Group types
export interface Group {
    id: number;
    name: string;
    description?: string;
    created_by: number;
    created_at: string;
    members: GroupMember[];
}

export interface GroupMember {
    id: number;
    group_id: number;
    user_id: number;
    user_name: string;
    role: 'admin' | 'member';
    joined_at: string;
}

export interface GroupExpense {
    id: number;
    group_id: number;
    paid_by: number;
    amount: number;
    description: string;
    category: string;
    expense_date: string;
    splits: ExpenseSplit[];
    created_at: string;
}

export interface ExpenseSplit {
    user_id: number;
    user_name: string;
    amount: number;
    is_paid: boolean;
}

// Chat types
export interface ChatMessage {
    id: number;
    session_id: number;
    sender: 'user' | 'bot';
    content: string;
    intent?: string;
    metadata?: any;
    created_at: string;
}

export interface ChatSession {
    id: number;
    user_id: number;
    title: string;
    created_at: string;
    last_active: string;
}

// API Response types
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Forecast types
export interface Forecast {
    date: string;
    predicted_amount: number;
    confidence_lower: number;
    confidence_upper: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}

// Voice recognition types
export interface VoiceRecognitionResult {
    transcript: string;
    confidence: number;
    isFinal: boolean;
}

// OCR types
export interface OCRResult {
    text: string;
    confidence: number;
    amount?: number;
    date?: string;
    merchant?: string;
    category?: string;
}
