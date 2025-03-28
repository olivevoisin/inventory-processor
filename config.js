/**
 * Application configuration
 */
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

const config = {
  // App info
  appName: 'Inventory Management System',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Server
  port: process.env.PORT || 8080,
  
  // API
  apiKey: process.env.API_KEY || 'test-api-key',
  
  // File uploads
  uploads: {
    voiceDir: process.env.VOICE_DIR || path.join(__dirname, 'uploads', 'voice'),
    invoiceDir: process.env.INVOICE_DIR || path.join(__dirname, 'uploads', 'invoices')
  },
  
  // Google APIs
  googleSheets: {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    docId: process.env.GOOGLE_SHEETS_DOC_ID
  },
  
  // Deepgram API
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY
  },
  
  // Translation
  translation: {
    apiKey: process.env.TRANSLATION_API_KEY
  },
  
  // Invoice processing
  invoiceProcessing: {
    enabled: process.env.INVOICE_PROCESSING_ENABLED === 'true',
    schedule: process.env.INVOICE_PROCESSING_SCHEDULE || '0 0 * * *' // Default: daily at midnight
  },
  
  // Health check
  healthCheck: {
    enabled: true,
    detailedStatusEnabled: process.env.NODE_ENV !== 'production',
    apiKey: process.env.HEALTH_CHECK_API_KEY
  }
};

module.exports = config;
