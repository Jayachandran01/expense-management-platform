require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const db = require('./database/connection');

const PORT = process.env.PORT || 5000;

// Test database connection, then start server
async function start() {
  try {
    await db.raw('SELECT 1');
    logger.info('✅ PostgreSQL connected');
  } catch (err) {
    logger.error('❌ PostgreSQL connection failed:', err.message);
    logger.info('💡 Make sure PostgreSQL is running and database "financeiq" exists');
    logger.info('💡 Create it with: createdb financeiq');
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📊 API: http://localhost:${PORT}/api/v1`);
    logger.info(`🔒 Health: http://localhost:${PORT}/api/v1/health`);
  });
}

start();

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await db.destroy();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
  process.exit(1);
});
