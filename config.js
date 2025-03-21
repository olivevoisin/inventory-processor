/**
 * Configuration Module
 * Contains configuration settings for the application
 */

// Default configuration
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
    apiKey: process.env.DEEPGRAM_API_KEY || 'mock-deepgram-key'
  },
  
  google: {
    apiKey: process.env.GOOGLE_TRANSLATE_API_KEY || 'mock-google-key'
  },
  
  // Google Sheets settings
  googleSheets: {
    docId: process.env.GOOGLE_SHEETS_DOC_ID || 'mock-sheets-doc-id',
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 'mock@example.com',
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY || 'mock-key'
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
