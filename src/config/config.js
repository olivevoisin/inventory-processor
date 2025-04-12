// projects/inventory-processor/src/config/config.js

const path = require('path');

/**
 * Configuration for inventory processor
 */
const config = {
  // Application environment
  env: process.env.NODE_ENV || 'development',
  
  // Report output directory
  reportOutputDir: process.env.REPORT_OUTPUT_DIR || path.join(process.cwd(), 'reports'),
  
  // Database configuration (placeholder)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 27017,
    name: process.env.DB_NAME || 'inventory',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  
  // Processing options
  processing: {
    defaultReportFormat: process.env.DEFAULT_REPORT_FORMAT || 'json',
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10)
  }
};

module.exports = config;