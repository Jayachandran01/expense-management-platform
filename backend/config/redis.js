const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        if (times > 3) {
            logger.warn('Redis connection failed after 3 retries, running without cache');
            return null;
        }
        return Math.min(times * 500, 3000);
    },
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.warn('Redis error (non-fatal):', err.message));

// Cache helper functions
const cache = {
    async get(key) {
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    },

    async set(key, value, ttlSeconds = 900) {
        try {
            await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch { /* non-fatal */ }
    },

    async del(key) {
        try { await redis.del(key); } catch { /* non-fatal */ }
    },

    async delPattern(pattern) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) await redis.del(...keys);
        } catch { /* non-fatal */ }
    },
};

module.exports = { redis, cache };
