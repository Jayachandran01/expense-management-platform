# PHASE 2 — DATABASE DESIGN (WITH EXPLANATION)

## Migration from SQLite to PostgreSQL

### Why PostgreSQL Over SQLite

| Feature | SQLite (Current) | PostgreSQL (Target) |
|---------|------------------|---------------------|
| Concurrent writes | Single writer lock | MVCC — unlimited concurrent writes |
| JSON support | Basic | Full JSONB with indexing |
| Full-text search | Extension required | Built-in `tsvector` |
| Partitioning | None | Native table partitioning |
| Connection pooling | N/A | PgBouncer support |
| Row-level locking | Table-level only | Row-level MVCC |
| Max DB size | ~281 TB (practical: 1GB) | Unlimited (practical: TBs) |
| Replication | None | Streaming replication |
| Free hosting | N/A | Neon, Supabase, Railway (free tiers) |

---

## Complete Schema Design

### 1. `users` Table

**Purpose**: Core identity table. Every piece of data in the system is owned by a user. This table stores authentication credentials, profile information, and account status.

**Why it matters**: User isolation is the foundation of multi-tenancy. Every query in the system filters by `user_id`.

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    avatar_url      VARCHAR(500),
    currency        VARCHAR(3) DEFAULT 'INR',
    timezone        VARCHAR(50) DEFAULT 'Asia/Kolkata',
    locale          VARCHAR(10) DEFAULT 'en-IN',
    role            VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'auditor')),
    is_active       BOOLEAN DEFAULT true,
    is_verified     BOOLEAN DEFAULT false,
    last_login_at   TIMESTAMPTZ,
    last_login_ip   INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    refresh_token_hash VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ  -- Soft delete
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
```

**Relationships**: Parent to all other tables via `user_id` foreign key.

**Indexing Strategy**:
- `email` — Unique constraint serves as index. Partial index excludes soft-deleted records.
- `role` — For RBAC queries (e.g., "list all admins").
- `is_active` — Partial index for login queries (only check active users).

**Scaling Considerations**:
- UUID primary key enables distributed ID generation (no sequence contention).
- `refresh_token_hash` stored here avoids a separate sessions table for simple setups.
- `failed_login_attempts` + `locked_until` — brute-force protection without Redis dependency.
- Soft delete via `deleted_at` — GDPR compliance, audit trail preservation.

---

### 2. `categories` Table

**Purpose**: Defines spending/income categories. Supports both system-provided defaults and user-created custom categories.

```sql
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    icon        VARCHAR(50),
    color       VARCHAR(7),
    is_system   BOOLEAN DEFAULT false,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(name, type, user_id)  -- Prevent duplicate categories per user
);

CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_system ON categories(is_system);
```

**Why SERIAL not UUID**: Categories are low-cardinality (50-100 per user max). Integer keys are smaller, faster for JOINs, and sequence contention is negligible.

**Indexing Strategy**:
- Composite unique constraint `(name, type, user_id)` prevents duplicates.
- `is_system` index for seeding queries ("get all system categories").

---

### 3. `transactions` Table

**Purpose**: The heart of the system. Stores every financial transaction with full metadata, source tracking, and AI categorization confidence.

```sql
CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id         INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    type                VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount              DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency            VARCHAR(3) DEFAULT 'INR',
    description         VARCHAR(500) NOT NULL,
    merchant            VARCHAR(100),
    payment_method      VARCHAR(50),
    transaction_date    DATE NOT NULL,
    is_recurring        BOOLEAN DEFAULT false,
    recurrence_pattern  VARCHAR(20) CHECK (recurrence_pattern IN ('daily','weekly','monthly','yearly')),
    tags                JSONB DEFAULT '[]'::jsonb,
    
    -- Data source tracking (enterprise feature)
    data_source         VARCHAR(20) DEFAULT 'manual' 
                        CHECK (data_source IN ('manual', 'voice', 'csv_import', 'ocr', 'recurring')),
    source_reference_id UUID,  -- Links to voice_logs.id, csv_import_logs.id, or ocr_receipts.id
    
    -- AI categorization metadata
    ai_categorized      BOOLEAN DEFAULT false,
    ai_confidence       DECIMAL(5,4),  -- 0.0000 to 1.0000
    original_category_id INTEGER,      -- Category before user override
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ  -- Soft delete
);

-- Primary query indexes
CREATE INDEX idx_txn_user_date ON transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_txn_user_type ON transactions(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_txn_user_category ON transactions(user_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_txn_date_range ON transactions(transaction_date) WHERE deleted_at IS NULL;

-- Search indexes
CREATE INDEX idx_txn_merchant ON transactions(merchant) WHERE merchant IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_txn_description_trgm ON transactions USING gin(description gin_trgm_ops);

-- Data source tracking index
CREATE INDEX idx_txn_source ON transactions(data_source, source_reference_id);

-- JSONB tags index
CREATE INDEX idx_txn_tags ON transactions USING gin(tags);
```

**Why UUID for transactions**: High-volume table. UUIDs prevent INSERT contention on sequence and enable client-side ID generation for offline support.

**Why `data_source` tracking**: Enterprise audit requirement. Knowing *how* a transaction entered the system is critical for:
- Data quality assessment ("what % of our data is AI-categorized?")
- Error tracing ("this CSV import had wrong dates")
- User behavior analytics ("users who use voice enter 3x more transactions")

**Why `ai_confidence` and `original_category_id`**: When AI auto-categorizes, we track confidence. If user overrides, we keep the original AI choice for model training feedback.

**Indexing Strategy**:
- `(user_id, transaction_date DESC)` — The most common query: "show my recent transactions." Composite index avoids a sort operation.
- Partial indexes with `WHERE deleted_at IS NULL` — Soft-deleted rows are excluded from all queries, saving index space.
- `gin_trgm_ops` on description — Enables fuzzy text search (`%search%` queries become fast).
- JSONB GIN index on tags — Enables `@>` containment queries on tags efficiently.

**Scaling Considerations**:
- **Partitioning candidate**: For 10M+ rows, partition by `transaction_date` (monthly partitions). Old partitions become read-only, new partition stays hot.
- DECIMAL(12,2) supports amounts up to 9,999,999,999.99 — sufficient for any currency.

---

### 4. `budgets` Table

**Purpose**: Defines spending limits per category or overall, with configurable alert thresholds and rollover capability.

```sql
CREATE TABLE budgets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id         INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    name                VARCHAR(100),
    budget_type         VARCHAR(10) NOT NULL CHECK (budget_type IN ('monthly', 'yearly', 'custom')),
    amount              DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    alert_threshold     INTEGER DEFAULT 80 CHECK (alert_threshold > 0 AND alert_threshold <= 100),
    is_active           BOOLEAN DEFAULT true,
    rollover_enabled    BOOLEAN DEFAULT false,
    rollover_amount     DECIMAL(12,2) DEFAULT 0,
    notes               TEXT,
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    
    CHECK (end_date > start_date)
);

CREATE INDEX idx_budgets_user_active ON budgets(user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_budgets_user_dates ON budgets(user_id, start_date, end_date) WHERE is_active = true;
CREATE INDEX idx_budgets_category ON budgets(category_id);
```

**Why `rollover_enabled`**: Enterprise users expect unspent budget to roll over. E.g., if you budget ₹5000/month for dining and spend ₹3000, next month's budget becomes ₹7000.

---

### 5. `groups` Table

**Purpose**: Enables shared expense tracking among multiple users (roommates, trips, projects).

```sql
CREATE TABLE groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    currency        VARCHAR(3) DEFAULT 'INR',
    is_active       BOOLEAN DEFAULT true,
    settled_at      TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_groups_creator ON groups(created_by);
CREATE INDEX idx_groups_active ON groups(is_active) WHERE deleted_at IS NULL;
```

### 6. `group_members` Table

```sql
CREATE TABLE group_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    left_at     TIMESTAMPTZ,
    
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_gm_group ON group_members(group_id);
CREATE INDEX idx_gm_user ON group_members(user_id);
```

### 7. `group_transactions` Table

**Purpose**: Tracks expenses within a group and how they're split among members.

```sql
CREATE TABLE group_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount          DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description     VARCHAR(500) NOT NULL,
    split_type      VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal', 'exact', 'percentage')),
    split_details   JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- split_details format: [{"user_id": "uuid", "amount": 500.00, "percentage": 25}]
    category_id     INTEGER REFERENCES categories(id),
    transaction_date DATE NOT NULL,
    is_settled      BOOLEAN DEFAULT false,
    settled_at      TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gt_group ON group_transactions(group_id);
CREATE INDEX idx_gt_paid_by ON group_transactions(paid_by);
CREATE INDEX idx_gt_settled ON group_transactions(is_settled);
```

**Why JSONB for `split_details`**: Split configurations are flexible (equal, exact amounts, percentages). JSONB avoids a separate `split_amounts` junction table while remaining queryable.

---

### 8. `voice_logs` Table

**Purpose**: Stores raw voice transcriptions and parsing results for audit trail and AI model improvement.

```sql
CREATE TABLE voice_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_transcript      TEXT NOT NULL,
    parsed_intent       VARCHAR(50),
    parsed_entities     JSONB,  -- {"amount": 500, "merchant": "Starbucks", "category": "food", "date": "2026-02-10"}
    confidence_score    DECIMAL(5,4),
    processing_status   VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'parsed', 'confirmed', 'rejected', 'failed')),
    resulting_txn_id    UUID REFERENCES transactions(id) ON DELETE SET NULL,
    error_message       TEXT,
    processing_time_ms  INTEGER,
    
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_user ON voice_logs(user_id);
CREATE INDEX idx_voice_status ON voice_logs(processing_status);
```

**Why we log everything**: Every voice entry is saved regardless of success. This enables: (1) debugging failed parses, (2) training data for improving intent detection, (3) audit compliance.

---

### 9. `ocr_receipts` Table

**Purpose**: Stores uploaded receipt images and Tesseract OCR extraction results.

```sql
CREATE TABLE ocr_receipts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename   VARCHAR(255) NOT NULL,
    stored_path         VARCHAR(500) NOT NULL,
    file_size_bytes     INTEGER NOT NULL,
    mime_type           VARCHAR(50) NOT NULL,
    
    -- OCR results
    raw_ocr_text        TEXT,
    extracted_amount    DECIMAL(12,2),
    extracted_date      DATE,
    extracted_merchant  VARCHAR(200),
    extracted_items     JSONB,  -- [{"name": "Coffee", "amount": 250}, ...]
    ocr_confidence      DECIMAL(5,4),
    
    processing_status   VARCHAR(20) DEFAULT 'pending' 
                        CHECK (processing_status IN ('pending', 'processing', 'extracted', 'confirmed', 'rejected', 'failed')),
    resulting_txn_id    UUID REFERENCES transactions(id) ON DELETE SET NULL,
    error_message       TEXT,
    processing_time_ms  INTEGER,
    
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ocr_user ON ocr_receipts(user_id);
CREATE INDEX idx_ocr_status ON ocr_receipts(processing_status);
```

---

### 10. `csv_import_logs` Table

**Purpose**: Tracks CSV bulk import jobs — their progress, results, and any errors.

```sql
CREATE TABLE csv_import_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename   VARCHAR(255) NOT NULL,
    stored_path         VARCHAR(500) NOT NULL,
    file_size_bytes     INTEGER NOT NULL,
    
    -- Import results
    total_rows          INTEGER DEFAULT 0,
    imported_rows       INTEGER DEFAULT 0,
    skipped_rows        INTEGER DEFAULT 0,
    failed_rows         INTEGER DEFAULT 0,
    duplicate_rows      INTEGER DEFAULT 0,
    
    -- Column mapping used
    column_mapping      JSONB,  -- {"date": "Transaction Date", "amount": "Amount", ...}
    
    -- Error details
    row_errors          JSONB DEFAULT '[]'::jsonb,  -- [{"row": 5, "error": "Invalid date format"}, ...]
    
    processing_status   VARCHAR(20) DEFAULT 'pending' 
                        CHECK (processing_status IN ('pending', 'validating', 'processing', 'completed', 'failed')),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    error_message       TEXT,
    
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csv_user ON csv_import_logs(user_id);
CREATE INDEX idx_csv_status ON csv_import_logs(processing_status);
```

---

### 11. `forecast_results` Table

**Purpose**: Caches AI-generated financial forecasts. Forecasts are expensive to compute, so we store results and regenerate periodically.

```sql
CREATE TABLE forecast_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    forecast_type   VARCHAR(30) NOT NULL CHECK (forecast_type IN ('spending', 'income', 'savings', 'category')),
    category_id     INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Forecast data
    forecast_data   JSONB NOT NULL,  -- [{"date": "2026-03", "predicted": 45000, "lower": 40000, "upper": 50000}]
    model_used      VARCHAR(50) DEFAULT 'prophet',
    data_points_used INTEGER,
    accuracy_metrics JSONB,  -- {"mae": 1200, "mape": 8.5, "rmse": 1800}
    
    forecast_horizon_months INTEGER DEFAULT 3,
    valid_until     TIMESTAMPTZ NOT NULL,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecast_user_type ON forecast_results(user_id, forecast_type);
CREATE INDEX idx_forecast_valid ON forecast_results(valid_until);
```

**Why `valid_until`**: Forecasts expire. A forecast generated on Feb 1 becomes inaccurate by Feb 15 because new data exists. The system regenerates forecasts via a scheduled job when they expire.

---

### 12. `ai_insights` Table

**Purpose**: Stores AI-generated financial insights, tips, and anomaly detections.

```sql
CREATE TABLE ai_insights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type    VARCHAR(50) NOT NULL,  -- 'spending_spike', 'savings_opportunity', 'budget_warning', etc.
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    severity        VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Actionable data
    metric_value    DECIMAL(12,2),
    metric_context  JSONB,  -- {"current_spending": 8000, "average": 5000, "increase_pct": 60}
    action_type     VARCHAR(50),  -- 'reduce_spending', 'increase_budget', 'review_subscription'
    
    is_read         BOOLEAN DEFAULT false,
    is_dismissed    BOOLEAN DEFAULT false,
    is_actionable   BOOLEAN DEFAULT true,
    
    generated_at    TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    dismissed_at    TIMESTAMPTZ
);

CREATE INDEX idx_insights_user_unread ON ai_insights(user_id) WHERE is_read = false AND is_dismissed = false;
CREATE INDEX idx_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_insights_expires ON ai_insights(expires_at);
```

---

### 13. `audit_logs` Table

**Purpose**: Immutable activity journal. Records every data modification for compliance, debugging, and security investigation.

```sql
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,  -- BIGSERIAL for high-volume append-only
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id      UUID,
    action          VARCHAR(50) NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
    entity_type     VARCHAR(50) NOT NULL,  -- 'transaction', 'budget', 'user', 'group'
    entity_id       UUID,
    
    -- Change details
    old_values      JSONB,
    new_values      JSONB,
    changed_fields  TEXT[],  -- PostgreSQL array: ['amount', 'category_id']
    
    -- Request context
    ip_address      INET,
    user_agent      VARCHAR(500),
    request_method  VARCHAR(10),
    request_path    VARCHAR(500),
    
    -- Metadata
    metadata        JSONB,  -- Additional context: {"import_id": "uuid", "batch_size": 500}
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs are APPEND-ONLY. No UPDATE or DELETE allowed.
-- This is enforced at application level + database trigger.

CREATE INDEX idx_audit_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_time ON audit_logs(created_at);
```

**Why BIGSERIAL**: Audit logs grow fast (every API call generates entries). BIGSERIAL supports 9.2 quintillion rows. UUID would waste space on a table that's only queried by other columns.

**Why append-only**: Audit logs must never be modified or deleted. This is a fundamental enterprise compliance requirement. Application code + DB triggers enforce this.

---

## Soft Delete Strategy

All major tables use `deleted_at TIMESTAMPTZ`:

```sql
-- Query pattern (applied everywhere)
SELECT * FROM transactions WHERE user_id = $1 AND deleted_at IS NULL;

-- Soft delete
UPDATE transactions SET deleted_at = NOW() WHERE id = $1;

-- Permanent delete (admin only, after retention period)
DELETE FROM transactions WHERE deleted_at < NOW() - INTERVAL '90 days';
```

**Why soft delete**:
1. **Undo capability** — Users can recover accidentally deleted transactions
2. **Audit integrity** — Audit logs reference entity IDs; hard delete would create orphans
3. **Legal compliance** — Financial data may need to be retained for regulatory periods
4. **Analytics accuracy** — Deleted transactions shouldn't retroactively change historical reports

**Partial indexes** (`WHERE deleted_at IS NULL`) ensure soft-deleted rows don't bloat active query indexes.

---

## Why This Schema Is Enterprise-Ready

| Criterion | How Our Schema Addresses It |
|-----------|-----------------------------|
| **Data integrity** | Foreign keys, CHECK constraints, UNIQUE constraints on every table |
| **Audit compliance** | Immutable audit_logs table with full change tracking |
| **Multi-source ingestion** | `data_source` + `source_reference_id` on transactions tracks origin |
| **AI transparency** | `ai_confidence`, `ai_categorized`, `original_category_id` provide full AI decision audit trail |
| **Soft deletes** | `deleted_at` on all major tables with partial indexes |
| **Scalability** | UUID PKs, partitioning-ready transactions table, proper indexing |
| **JSONB flexibility** | Tags, split details, forecast data, error logs — structured but flexible |
| **Performance** | Composite indexes match exact query patterns; partial indexes reduce index size |
| **Security** | RBAC via user roles, password lockout, IP tracking |
| **Internationalization** | Currency, timezone, locale stored per-user |
