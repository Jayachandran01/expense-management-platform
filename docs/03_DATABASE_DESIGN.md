# 3️⃣ DATABASE DESIGN (ENTERPRISE GRADE)

## Overview

The database is designed following **Third Normal Form (3NF)** principles to eliminate redundancy while maintaining query performance. The schema is structured for **SQLite** (development) with **PostgreSQL migration readiness** (production).

---

## Entity-Relationship (ER) Model

### ER Diagram (Text Representation)

```
┌─────────────┐
│    USERS    │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────┴──────────┐       ┌─────────────┐
│  TRANSACTIONS   │       │   BUDGETS   │
└──────┬──────────┘       └──────┬──────┘
       │ N                       │ 1
       │                         │
       │ 1                       │ N
┌──────┴──────────┐       ┌──────┴──────────┐
│   CATEGORIES    │       │  CHAT_SESSIONS  │
└─────────────────┘       └──────┬──────────┘
                                 │ 1
                                 │
                                 │ N
                          ┌──────┴──────────┐
                          │  CHAT_MESSAGES  │
                          └─────────────────┘

┌─────────────┐       ┌─────────────┐
│    USERS    │───────│   INSIGHTS  │
└─────────────┘  1:N  └─────────────┘

┌─────────────┐       ┌─────────────┐
│    USERS    │───────│    ALERTS   │
└─────────────┘  1:N  └─────────────┘
```

---

## Table Definitions

### 1. USERS Table

**Purpose**: Store user account information

**Schema**:

| Column Name      | Data Type      | Constraints                          | Description                          |
|------------------|----------------|--------------------------------------|--------------------------------------|
| id               | INTEGER        | PRIMARY KEY, AUTO_INCREMENT          | Unique user identifier               |
| email            | VARCHAR(255)   | UNIQUE, NOT NULL                     | User email (login credential)        |
| password_hash    | VARCHAR(255)   | NOT NULL                             | bcrypt hashed password               |
| full_name        | VARCHAR(100)   | NOT NULL                             | User's full name                     |
| phone            | VARCHAR(20)    | NULL                                 | Contact number                       |
| currency         | VARCHAR(3)     | DEFAULT 'INR'                        | Preferred currency (ISO 4217)        |
| timezone         | VARCHAR(50)    | DEFAULT 'Asia/Kolkata'               | User timezone                        |
| is_active        | BOOLEAN        | DEFAULT TRUE                         | Account active status                |
| is_verified      | BOOLEAN        | DEFAULT FALSE                        | Email verification status            |
| last_login_at    | TIMESTAMP      | NULL                                 | Last login timestamp                 |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP            | Account creation time                |
| updated_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP ON UPDATE  | Last update time                     |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE INDEX: `email`
- INDEX: `is_active` (for filtering active users)

---

### 2. CATEGORIES Table

**Purpose**: Store expense/income categories

**Schema**:

| Column Name      | Data Type      | Constraints                          | Description                          |
|------------------|----------------|--------------------------------------|--------------------------------------|
| id               | INTEGER        | PRIMARY KEY, AUTO_INCREMENT          | Unique category identifier           |
| name             | VARCHAR(50)    | NOT NULL                             | Category name                        |
| type             | ENUM           | NOT NULL ('income', 'expense')       | Category type                        |
| icon             | VARCHAR(50)    | NULL                                 | Icon identifier                      |
| color            | VARCHAR(7)     | NULL                                 | Hex color code                       |
| is_system        | BOOLEAN        | DEFAULT FALSE                        | System-defined (cannot be deleted)   |
| user_id          | INTEGER        | NULL, FOREIGN KEY → users(id)        | NULL for system, user ID for custom  |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP            | Creation time                        |

---

### 3. TRANSACTIONS Table

**Purpose**: Store all income and expense transactions

**Schema**:

| Column Name      | Data Type      | Constraints                          | Description                          |
|------------------|----------------|--------------------------------------|--------------------------------------|
| id               | INTEGER        | PRIMARY KEY, AUTO_INCREMENT          | Unique transaction identifier        |
| user_id          | INTEGER        | NOT NULL, FOREIGN KEY → users(id)    | Transaction owner                    |
| category_id      | INTEGER        | NOT NULL, FOREIGN KEY → categories(id)| Transaction category                |
| type             | ENUM           | NOT NULL ('income', 'expense')       | Transaction type                     |
| amount           | DECIMAL(10,2)  | NOT NULL, CHECK (amount > 0)         | Transaction amount                   |
| description      | VARCHAR(500)   | NOT NULL                             | Transaction description/note         |
| merchant         | VARCHAR(100)   | NULL                                 | Merchant/payee name                  |
| payment_method   | VARCHAR(50)    | NULL                                 | Payment method                       |
| transaction_date | DATE           | NOT NULL                             | Actual transaction date              |
| is_recurring     | BOOLEAN        | DEFAULT FALSE                        | Recurring transaction flag           |
| tags             | TEXT           | NULL                                 | Comma-separated tags                 |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP            | Record creation time                 |

---

### 4. BUDGETS Table

**Purpose**: Store user-defined budget limits

**Schema**:

| Column Name      | Data Type      | Constraints                          | Description                          |
|------------------|----------------|--------------------------------------|--------------------------------------|
| id               | INTEGER        | PRIMARY KEY, AUTO_INCREMENT          | Unique budget identifier             |
| user_id          | INTEGER        | NOT NULL, FOREIGN KEY → users(id)    | Budget owner                         |
| category_id      | INTEGER        | NULL, FOREIGN KEY → categories(id)   | NULL for overall budget              |
| budget_type      | ENUM           | NOT NULL ('monthly', 'yearly')       | Budget period type                   |
| amount           | DECIMAL(10,2)  | NOT NULL, CHECK (amount > 0)         | Budget limit amount                  |
| start_date       | DATE           | NOT NULL                             | Budget period start                  |
| end_date         | DATE           | NOT NULL                             | Budget period end                    |
| alert_threshold  | INTEGER        | DEFAULT 80                           | Alert when % consumed                |
| is_active        | BOOLEAN        | DEFAULT TRUE                         | Budget active status                 |

---

### 5. CHAT_SESSIONS Table (🤖 AI Module)

**Purpose**: Store chat conversations for context retention

**Schema**:

| Column Name      | Data Type      | Constraints                          | Description                          |
|------------------|----------------|--------------------------------------|--------------------------------------|
| id               | VARCHAR(36)    | PRIMARY KEY (UUID)                   | Unique session identifier            |
| user_id          | INTEGER        | NOT NULL, FOREIGN KEY → users(id)    | Session owner                        |
| title            | VARCHAR(100)   | NULL                                 | Auto-generated conversation summary  |
| is_active        | BOOLEAN        | DEFAULT TRUE                         | Is current active session?           |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP            | Session start                        |
| last_message_at  | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP            | Last activity                        |

**Indexes**:
- PRIMARY KEY: `id`
- INDEX: `user_id`
- COMPOSITE INDEX: `(user_id, is_active)` for fast retrieval of current chat

---

### 6. CHAT_MESSAGES Table (🤖 AI Module)

**Purpose**: Store individual messages for audit and context

**Schema**:

| Column Name      | Data Type      | Constraints                          | Description                          |
|------------------|----------------|--------------------------------------|--------------------------------------|
| id               | INTEGER        | PRIMARY KEY, AUTO_INCREMENT          | Unique message identifier            |
| session_id       | VARCHAR(36)    | NOT NULL, FOREIGN KEY → chat_sessions| Linked session                       |
| sender           | ENUM           | NOT NULL ('user', 'bot', 'system')   | Who sent the message                 |
| content          | TEXT           | NOT NULL                             | Message content (Markdown supported) |
| intent           | VARCHAR(50)    | NULL                                 | Detected intent (for analysis)       |
| metadata         | JSON           | NULL                                 | structured data (e.g., chart config) |
| created_at       | TIMESTAMP      | DEFAULT CURRENT_TIMESTAMP            | Message timestamp                    |

**Indexes**:
- PRIMARY KEY: `id`
- INDEX: `session_id` (for loading chat history)
- INDEX: `intent` (for analytics on bot usage)

---

### Initialize Database Script (Updated)

```sql
-- Existing tables (Users, Categories, Transactions, Budgets...)

-- Create Chat Sessions
CREATE TABLE chat_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Chat Messages
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id VARCHAR(36) NOT NULL,
  sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'bot', 'system')),
  content TEXT NOT NULL,
  intent VARCHAR(50),
  metadata TEXT, -- JSON stored as text in SQLite
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Create Indexes
CREATE INDEX idx_chat_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
```

---

## Conclusion

The database is now fully capable of supporting the **AI Financial Assistant** while maintaining strict relational integrity for core financial data.
