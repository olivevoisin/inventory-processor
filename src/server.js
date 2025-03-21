/**
 * Server entry point for Inventory Manager application
 */
const app = require('./app');
const logger = require('./utils/logger');
const config = require('./config');

// Get port from config
const PORT = config.port;

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.environment} mode on port ${PORT}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM signal
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  
  server.close(() => {
    logger.info('Process terminated');
  });
});
