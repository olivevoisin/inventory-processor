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
  
  // Upload directories
  uploads: {
    audioDir: process.env.AUDIO_UPLOAD_DIR || './uploads/audio',
    invoiceDir: process.env.INVOICE_UPLOAD_DIR || './uploads/invoices',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB
  },
  
  // External API keys
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || 'test-deepgram-key'
  },
  
  // Google Sheets configuration
  googleSheets: {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY || 'test-sheets-key',
    docId: process.env.GOOGLE_SHEETS_DOC_ID || 'test-doc-id',
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 'test-client-email',
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY || 'test-private-key'
  },
  
  // Translation settings
  translation: {
    apiKey: process.env.TRANSLATION_API_KEY || 'test-translation-key'
  },
  
  // Invoice processing
  invoiceProcessing: {
    enabled: process.env.INVOICE_PROCESSING_ENABLED === 'true',
    schedulerEnabled: process.env.INVOICE_SCHEDULER_ENABLED === 'true',
    schedule: process.env.INVOICE_PROCESSING_SCHEDULE || '0 0 1,15 * *' // Default: midnight on 1st and 15th
  },
  
  // Health check
  healthCheck: {
    enabled: true,
    detailedStatusEnabled: process.env.DETAILED_HEALTH_CHECK_ENABLED === 'true',
    apiKey: process.env.HEALTH_CHECK_API_KEY
  },
  
  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE === 'true',
      directory: process.env.LOG_DIRECTORY || './logs',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10)
    }
  }
};

module.exports = config;
