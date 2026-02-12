const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Core routes
const authRoutes = require('./authRoutes');
const transactionRoutes = require('./transactionRoutes');
const budgetRoutes = require('./budgetRoutes');
const categoryRoutes = require('./categoryRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const chatRoutes = require('./chatRoutes');
const groupRoutes = require('./groupRoutes');

// Enterprise routes (load gracefully)
let voiceRoutes, importRoutes, receiptRoutes, insightRoutes, auditRoutes;
try {
  voiceRoutes = require('./voiceRoutes');
  importRoutes = require('./importRoutes');
  receiptRoutes = require('./receiptRoutes');
  insightRoutes = require('./insightRoutes');
  auditRoutes = require('./auditRoutes');
  logger.info('✅ Enterprise routes loaded');
} catch (err) {
  logger.warn('⚠️ Enterprise routes not available:', err.message);
}

// API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI Financial Intelligence Platform API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      transactions: '/api/v1/transactions',
      budgets: '/api/v1/budgets',
      categories: '/api/v1/categories',
      analytics: '/api/v1/analytics',
      chat: '/api/v1/chat',
      groups: '/api/v1/groups',
      voice: voiceRoutes ? '/api/v1/voice' : 'unavailable',
      imports: importRoutes ? '/api/v1/imports' : 'unavailable',
      receipts: receiptRoutes ? '/api/v1/receipts' : 'unavailable',
      insights: insightRoutes ? '/api/v1/insights' : 'unavailable',
      audit: auditRoutes ? '/api/v1/audit-logs' : 'unavailable',
    },
  });
});

// Health check
router.get('/health', async (req, res) => {
  const health = { status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString(), services: {} };
  try {
    const db = require('../database/connection');
    await db.raw('SELECT 1');
    health.services.postgres = 'connected';
  } catch { health.services.postgres = 'disconnected'; }
  try {
    const { redis } = require('../config/redis');
    await redis.ping();
    health.services.redis = 'connected';
  } catch { health.services.redis = 'disconnected'; }
  res.json(health);
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/categories', categoryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/chat', chatRoutes);
router.use('/groups', groupRoutes);

if (voiceRoutes) router.use('/voice', voiceRoutes);
if (importRoutes) router.use('/imports', importRoutes);
if (receiptRoutes) router.use('/receipts', receiptRoutes);
if (insightRoutes) router.use('/insights', insightRoutes);
if (auditRoutes) router.use('/audit-logs', auditRoutes);

// 404 catch-all
router.use('*', (req, res) => {
  res.status(404).json({ success: false, error: { message: `Route ${req.originalUrl} not found` } });
});

module.exports = router;
