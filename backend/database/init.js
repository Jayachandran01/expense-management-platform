const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'expense_tracker.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        logger.error('Error opening database:', err);
    } else {
        logger.info(`Database connected: ${DB_PATH}`);
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Database initialization function
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create Users Table
            db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          currency VARCHAR(3) DEFAULT 'INR',
          timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
          is_active BOOLEAN DEFAULT 1,
          is_verified BOOLEAN DEFAULT 0,
          last_login_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
                if (err) logger.error('Error creating users table:', err);
                else logger.info('✓ Users table ready');
            });

            // Create Categories Table
            db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(50) NOT NULL,
          type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
          icon VARCHAR(50),
          color VARCHAR(7),
          is_system BOOLEAN DEFAULT 0,
          user_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
                if (err) logger.error('Error creating categories table:', err);
                else logger.info('✓ Categories table ready');
            });

            // Create Transactions Table
            db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
          amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
          description VARCHAR(500) NOT NULL,
          merchant VARCHAR(100),
          payment_method VARCHAR(50),
          transaction_date DATE NOT NULL,
          is_recurring BOOLEAN DEFAULT 0,
          tags TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
        )
      `, (err) => {
                if (err) logger.error('Error creating transactions table:', err);
                else logger.info('✓ Transactions table ready');
            });

            // Create Budgets Table
            db.run(`
        CREATE TABLE IF NOT EXISTS budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          category_id INTEGER,
          budget_type VARCHAR(10) NOT NULL CHECK (budget_type IN ('monthly', 'yearly')),
          amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold > 0 AND alert_threshold <= 100),
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
        )
      `, (err) => {
                if (err) logger.error('Error creating budgets table:', err);
                else logger.info('✓ Budgets table ready');
            });

            // Create Insights Table
            db.run(`
        CREATE TABLE IF NOT EXISTS insights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          insight_type VARCHAR(50) NOT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT NOT NULL,
          category_id INTEGER,
          priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
          metric_value DECIMAL(10,2),
          is_read BOOLEAN DEFAULT 0,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
      `, (err) => {
                if (err) logger.error('Error creating insights table:', err);
                else logger.info('✓ Insights table ready');
            });

            // Create Alerts Table
            db.run(`
        CREATE TABLE IF NOT EXISTS alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          severity VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
          is_dismissed BOOLEAN DEFAULT 0,
          triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          dismissed_at TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
                if (err) logger.error('Error creating alerts table:', err);
                else logger.info('✓ Alerts table ready');
            });

            // Create Audit Logs Table
            db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INTEGER NOT NULL,
          old_values TEXT,
          new_values TEXT,
          ip_address VARCHAR(45),
          user_agent VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `, (err) => {
                if (err) logger.error('Error creating audit_logs table:', err);
                else logger.info('✓ Audit logs table ready');
            });

            // Create Chat Sessions Table
            db.run(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id VARCHAR(36) PRIMARY KEY,
          user_id INTEGER NOT NULL,
          title VARCHAR(100),
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
                if (err) logger.error('Error creating chat_sessions table:', err);
                else logger.info('✓ Chat sessions table ready');
            });

            // Create Chat Messages Table
            db.run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id VARCHAR(36) NOT NULL,
          sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'bot', 'system')),
          content TEXT NOT NULL,
          intent VARCHAR(50),
          metadata TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        )
      `, (err) => {
                if (err) logger.error('Error creating chat_messages table:', err);
                else logger.info('✓ Chat messages table ready');
            });

            // Create Indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)');
            db.run('CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date)');

            db.run('CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_budgets_user_active ON budgets(user_id, is_active)');

            db.run('CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_insights_read ON insights(is_read)');

            db.run('CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts(is_dismissed)');

            db.run('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id)', (err) => {
                if (err) {
                    logger.error('Error creating indexes:', err);
                    reject(err);
                } else {
                    logger.info('✓ All indexes created');
                    logger.info('✅ Database initialization complete');
                    resolve();
                }
            });
        });
    });
};

// Query helper function
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                logger.error('Database query error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Run helper function (for INSERT, UPDATE, DELETE)
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                logger.error('Database run error:', err);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

// Get single row helper
const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                logger.error('Database get error:', err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

module.exports = {
    db,
    initializeDatabase,
    query,
    run,
    get
};
