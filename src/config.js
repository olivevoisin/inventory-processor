/**
 * Configuration Module
 * Contains configuration settings for the application
 */

// Load environment variables
require('dotenv').config();

const config = {
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // API settings
  corsOrigins: process.env.CORS_ORIGINS || '*',
  
  // Database settings (placeholder for real implementation)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'inventory',
    ssl: process.env.DB_SSL === 'true'
  },
  
  // Upload directories
  uploads: {
    audioDir: process.env.AUDIO_UPLOAD_DIR || './uploads/audio',
    invoiceDir: process.env.INVOICE_UPLOAD_DIR || './uploads/invoices',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB
  },
  
  // External API keys
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || 'mock-deepgram-key'
  },
  
  google: {
    apiKey: process.env.GOOGLE_TRANSLATE_API_KEY || 'mock-google-key'
  },
  
  // Monitoring settings
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    alertThresholds: {
      memory: parseInt(process.env.MEMORY_THRESHOLD || '70', 10),
      cpu: parseInt(process.env.CPU_THRESHOLD || '70', 10),
      apiErrors: parseInt(process.env.API_ERROR_THRESHOLD || '10', 10)
    },
    checkIntervalMs: parseInt(process.env.MONITORING_INTERVAL || '60000', 10)
  },
  
  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10)
  }
};

module.exports = config;
