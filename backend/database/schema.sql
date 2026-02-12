-- =============================================
-- AI Financial Intelligence Platform
-- PostgreSQL Schema Migration
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    currency VARCHAR(3) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'auditor')),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    refresh_token_hash VARCHAR(255),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- =============================================
-- 2. CATEGORIES
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    icon VARCHAR(10) DEFAULT '📦',
    color VARCHAR(7) DEFAULT '#6366f1',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_user ON categories(user_id);

-- =============================================
-- 3. TRANSACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    merchant VARCHAR(200),
    payment_method VARCHAR(30) DEFAULT 'cash',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tags TEXT[],
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20),
    data_source VARCHAR(20) DEFAULT 'manual' CHECK (data_source IN ('manual', 'csv', 'voice', 'ocr')),
    source_reference_id VARCHAR(100),
    ai_categorized BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(4,3),
    original_category_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_txn_user_date ON transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_txn_category ON transactions(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_txn_type ON transactions(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_txn_source ON transactions(data_source);

-- =============================================
-- 4. BUDGETS
-- =============================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    budget_type VARCHAR(20) DEFAULT 'monthly' CHECK (budget_type IN ('weekly', 'monthly', 'yearly', 'custom')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    alert_threshold INT DEFAULT 80 CHECK (alert_threshold BETWEEN 1 AND 100),
    rollover_enabled BOOLEAN DEFAULT false,
    rollover_amount DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_budget_user ON budgets(user_id) WHERE deleted_at IS NULL;

-- =============================================
-- 5. GROUPS
-- =============================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. GROUP MEMBERS
-- =============================================
CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- =============================================
-- 7. GROUP TRANSACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS group_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'custom')),
    split_details JSONB,
    is_settled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grp_txn_group ON group_transactions(group_id);

-- =============================================
-- 8. VOICE LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS voice_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_transcript TEXT NOT NULL,
    parsed_intent VARCHAR(20),
    parsed_entities JSONB,
    confidence_score DECIMAL(4,3),
    resulting_txn_id UUID REFERENCES transactions(id),
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'parsed', 'confirmed', 'rejected', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_user ON voice_logs(user_id);

-- =============================================
-- 9. OCR RECEIPTS
-- =============================================
CREATE TABLE IF NOT EXISTS ocr_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255),
    stored_path TEXT NOT NULL,
    file_size_bytes INT,
    mime_type VARCHAR(50),
    raw_ocr_text TEXT,
    extracted_amount DECIMAL(12,2),
    extracted_date DATE,
    extracted_merchant VARCHAR(200),
    extracted_items JSONB,
    ocr_confidence DECIMAL(4,3),
    resulting_txn_id UUID REFERENCES transactions(id),
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'extracted', 'confirmed', 'failed')),
    processing_time_ms INT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ocr_user ON ocr_receipts(user_id);

-- =============================================
-- 10. CSV IMPORT LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS csv_import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255),
    stored_path TEXT,
    file_size_bytes INT,
    total_rows INT DEFAULT 0,
    imported_rows INT DEFAULT 0,
    skipped_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    duplicate_rows INT DEFAULT 0,
    column_mapping JSONB,
    row_errors JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'validating', 'processing', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 11. FORECAST RESULTS
-- =============================================
CREATE TABLE IF NOT EXISTS forecast_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    forecast_type VARCHAR(30) DEFAULT 'spending',
    forecast_data JSONB NOT NULL,
    model_used VARCHAR(30) DEFAULT 'prophet',
    data_points_used INT,
    accuracy_metrics JSONB,
    forecast_horizon_months INT DEFAULT 3,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecast_user ON forecast_results(user_id);

-- =============================================
-- 12. AI INSIGHTS
-- =============================================
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    category_id INT REFERENCES categories(id),
    metric_value DECIMAL(12,2),
    metric_context JSONB,
    action_type VARCHAR(50),
    is_actionable BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insight_user ON ai_insights(user_id);
CREATE INDEX idx_insight_unread ON ai_insights(user_id) WHERE is_read = false AND is_dismissed = false;

-- =============================================
-- 13. AUDIT LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(30) NOT NULL,
    entity_type VARCHAR(30),
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);

-- =============================================
-- 14. CHAT SESSIONS
-- =============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) DEFAULT 'New Chat',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 15. CHAT MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    intent VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_session ON chat_messages(session_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
