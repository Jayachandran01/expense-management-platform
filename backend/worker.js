/**
 * BullMQ Worker Process
 * Handles all background jobs: CSV import, OCR, forecasting, budget evaluation, insights
 * Run as separate process: node worker.js
 */
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('./utils/logger');
require('dotenv').config();

const connection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
});

// ==================== CSV IMPORT WORKER ====================
const csvWorker = new Worker('csv-import', async (job) => {
    const CSVImportService = require('./services/CSVImportService');
    logger.info(`📥 Processing CSV import: ${job.id}`);

    const result = await CSVImportService.processImport(
        job.data.importId,
        job.data.userId,
        (progress) => job.updateProgress(progress),
    );

    logger.info(`✅ CSV import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`);
    return result;
}, { connection, concurrency: 3 });

// ==================== OCR WORKER ====================
const ocrWorker = new Worker('ocr-processing', async (job) => {
    const OCRService = require('./services/OCRService');
    logger.info(`📸 Processing receipt: ${job.data.receiptId}`);

    const result = await OCRService.processReceipt(job.data.receiptId);
    logger.info(`✅ OCR complete: ${result.status}, confidence: ${result.confidence}`);
    return result;
}, { connection, concurrency: 2 });

// ==================== FORECAST WORKER ====================
const forecastWorker = new Worker('forecast-compute', async (job) => {
    const ForecastService = require('./services/ForecastService');
    logger.info(`📈 Computing forecast for user: ${job.data.userId}`);

    const result = await ForecastService.generateForecast(job.data.userId, job.data.horizonMonths || 3);
    logger.info(`✅ Forecast complete for user: ${job.data.userId}`);
    return result;
}, { connection, concurrency: 1 });

// ==================== BUDGET EVALUATION WORKER ====================
const budgetWorker = new Worker('budget-evaluation', async (job) => {
    const db = require('./database/connection');
    const InsightService = require('./services/InsightService');
    logger.info(`💰 Evaluating budgets`);

    // Get all active budgets
    const budgets = await db('budgets').where({ is_active: true }).whereNull('deleted_at');
    const userIds = [...new Set(budgets.map((b) => b.user_id))];

    for (const userId of userIds) {
        try {
            await InsightService.checkBudgetProjection(userId);
        } catch (err) {
            logger.error(`Budget evaluation failed for user ${userId}:`, err.message);
        }
    }

    logger.info(`✅ Budget evaluation complete for ${userIds.length} users`);
    return { usersProcessed: userIds.length };
}, { connection, concurrency: 5 });

// ==================== INSIGHT GENERATION WORKER ====================
const insightWorker = new Worker('insight-generation', async (job) => {
    const InsightService = require('./services/InsightService');
    const db = require('./database/connection');
    logger.info(`🧠 Generating insights`);

    // Find users with recent activity
    const activeUsers = await db('transactions')
        .distinct('user_id')
        .where('created_at', '>', db.raw("NOW() - INTERVAL '7 days'"));

    for (const { user_id } of activeUsers) {
        try {
            await InsightService.generateInsights(user_id);
        } catch (err) {
            logger.error(`Insight generation failed for user ${user_id}:`, err.message);
        }
    }

    logger.info(`✅ Insights generated for ${activeUsers.length} users`);
    return { usersProcessed: activeUsers.length };
}, { connection, concurrency: 3 });

// ==================== ERROR HANDLERS ====================
[csvWorker, ocrWorker, forecastWorker, budgetWorker, insightWorker].forEach((worker) => {
    worker.on('completed', (job) => {
        logger.info(`✅ Job ${job.id} completed (${job.queueName})`);
    });
    worker.on('failed', (job, err) => {
        logger.error(`❌ Job ${job?.id} failed (${job?.queueName}): ${err.message}`);
    });
});

// ==================== CRON SCHEDULER ====================
const { Queue } = require('bullmq');

const forecastQueue = new Queue('forecast-compute', { connection });
const budgetQueue = new Queue('budget-evaluation', { connection });
const insightQueue = new Queue('insight-generation', { connection });

// Schedule cron jobs (idempotent — won't create duplicates)
(async () => {
    try {
        await forecastQueue.add('weekly-forecast', {}, { repeat: { pattern: '0 2 * * 0' } });
        await budgetQueue.add('daily-budget-check', {}, { repeat: { pattern: '0 6 * * *' } });
        await insightQueue.add('daily-insights', {}, { repeat: { pattern: '0 3 * * *' } });
        logger.info('📅 Cron jobs scheduled');
    } catch (err) {
        logger.warn('Failed to schedule cron jobs (Redis may be unavailable):', err.message);
    }
})();

logger.info('🔧 All workers started and listening for jobs');

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Shutting down workers...');
    await Promise.all([
        csvWorker.close(),
        ocrWorker.close(),
        forecastWorker.close(),
        budgetWorker.close(),
        insightWorker.close(),
    ]);
    process.exit(0);
});
