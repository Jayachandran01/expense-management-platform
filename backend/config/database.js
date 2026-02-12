const path = require('path');

module.exports = {
    database: {
        client: 'sqlite3',
        connection: {
            filename: process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'expense_tracker.db')
        },
        useNullAsDefault: true,
        pool: {
            min: 1,
            max: 10,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 30000
        }
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    },

    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
    },

    pagination: {
        defaultLimit: 20,
        maxLimit: 100
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    }
};
