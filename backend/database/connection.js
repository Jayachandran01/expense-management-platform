const knex = require('knex');
const knexConfig = require('../knexfile');
const logger = require('../utils/logger');

const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

// Test connection
db.raw('SELECT 1')
    .then(() => logger.info('✅ PostgreSQL connected successfully'))
    .catch((err) => {
        logger.error('❌ PostgreSQL connection failed:', err.message);
        logger.info('💡 Falling back to SQLite for development...');
    });

module.exports = db;
