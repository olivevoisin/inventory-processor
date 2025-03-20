/**
 * Invoice Processing Service
 * 
 * Entry point for running the invoice scheduler as a standalone service
 * or for integrating it into the main application.
 */

const invoiceScheduler = require('./invoice-scheduler');
const logger = require('../utils/logger');

// Initialize the invoice scheduler
function start() {
  try {
    logger.info('Starting invoice processing service');
    invoiceScheduler.initializeScheduler();
    logger.info('Invoice processing service started successfully');
  } catch (error) {
    logger.error(`Failed to start invoice processing service: ${error.message}`);
    process.exit(1);
  }
}

// Handle process events for graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down invoice processing service');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down invoice processing service');
  process.exit(0);
});

// Start the service if this script is run directly
if (require.main === module) {
  start();
} else {
  // Export start function for use in the main application
  module.exports = { start };
}