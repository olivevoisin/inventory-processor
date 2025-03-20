/**
 * Unified configuration for inventory management application
 */

// Load environment variables
require('dotenv').config();

// Helper function to validate critical configuration
function validateConfig(config) {
  const criticalKeys = [
    'googleSheets.docId', 
    'googleSheets.clientEmail', 
    'googleSheets.privateKey',
    'deepgram.apiKey'
  ];
  
  const missingKeys = [];
  
  criticalKeys.forEach(key => {
    const parts = key.split('.');
    let current = config;
    
    for (const part of parts) {
      current = current[part];
      if (current === undefined || current === null || current === '') {
        missingKeys.push(key);
        break;
      }
    }
  });
  
  if (missingKeys.length > 0) {
    console.warn(`WARNING: Missing critical configuration: ${missingKeys.join(', ')}`);
  }
  
  return config;
}

// Configuration object
const config = {
  // Application info
  appName: process.env.APP_NAME || 'Inventory Management System',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // API Base URL
  apiBaseUrl: process.env.API_BASE_URL || 'https://inventory-processor-189091938007.us-central1.run.app',
  
  // Google Cloud configuration
  googleCloud: {
    enabled: process.env.GOOGLE_CLOUD_ENABLED === 'true',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  },
  
  // Google Sheets configuration (centralized)
  googleSheets: {
    docId: process.env.GOOGLE_SHEETS_DOC_ID,
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    inventorySheetName: process.env.INVENTORY_SHEET_NAME || 'Inventory',
    transactionsSheetName: process.env.TRANSACTIONS_SHEET_NAME || 'Transactions',
    vendorsSheetName: process.env.VENDORS_SHEET_NAME || 'Vendors',
  },

  // OCR Configuration
  ocr: {
    enabled: process.env.OCR_ENABLED === 'true',
    apiKey: process.env.OCR_API_KEY,
    tesseractOptions: {
      workerPath: 'https://unpkg.com/tesseract.js@v4.0.2/dist/worker.min.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: message => console.log(message)
    }
  },

  // Deepgram configuration (consolidated)
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY,
    model: process.env.DEEPGRAM_MODEL || 'nova-2',
    language: process.env.DEEPGRAM_LANGUAGE || 'en-US',
  },
  
  // Translation configuration (consolidated)
  googleTranslate: {
    enabled: process.env.GOOGLE_TRANSLATE_ENABLED === 'true',
    apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
    projectId: process.env.GOOGLE_TRANSLATE_PROJECT_ID,
    keyFilename: process.env.GOOGLE_TRANSLATE_KEY_FILE,
    cacheExpiration: parseInt(process.env.TRANSLATION_CACHE_EXPIRY || '86400', 10), // 24 hours
  },
  
  // Health check configuration
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
    apiKey: process.env.HEALTH_CHECK_API_KEY,
    detailedStatusEnabled: process.env.DETAILED_STATUS_ENABLED === 'true',
  },
  
  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    enablePersistence: process.env.MONITORING_PERSISTENCE_ENABLED === 'true',
    persistIntervalMinutes: parseInt(process.env.MONITORING_PERSIST_INTERVAL || '10', 10),
    enablePeriodicReporting: process.env.MONITORING_PERIODIC_REPORTING_ENABLED === 'true',
    reportingIntervalMinutes: parseInt(process.env.MONITORING_REPORTING_INTERVAL || '60', 10),
    alertThresholds: {
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'),
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '2000', 10),
    }
  },
  
  // Notifications configuration
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      from: process.env.EMAIL_FROM || 'notifications@inventory-app.com',
      to: process.env.EMAIL_TO || 'admin@example.com',
      criticalTo: process.env.EMAIL_CRITICAL_TO || process.env.EMAIL_TO || 'admin@example.com',
    },
  },
  
  // Invoice processing configuration (consolidated)
  invoiceProcessing: {
    enabled: process.env.INVOICE_PROCESSING_ENABLED === 'true',
    schedule: process.env.INVOICE_PROCESSING_SCHEDULE || '0 0 1,15 * *', // 1st and 15th of the month
    inputDir: process.env.INVOICE_INPUT_DIR || './data/invoices/incoming',
    archiveDir: process.env.INVOICE_ARCHIVE_DIR || './data/invoices/processed',
    errorDir: process.env.INVOICE_ERROR_DIR || './data/invoices/errors',
    supportedFormats: (process.env.INVOICE_SUPPORTED_FORMATS || 'pdf,png,jpg,jpeg').split(','),
    allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
    archiveProcessed: process.env.ARCHIVE_PROCESSED_INVOICES === 'true',
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)
  },
  
  // Retry configuration
  retries: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY || '300', 10),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '5000', 10),
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    consoleEnabled: process.env.CONSOLE_LOGGING_ENABLED !== 'false',
    fileEnabled: process.env.FILE_LOGGING_ENABLED === 'true',
    logDir: process.env.LOG_DIR || './logs',
    maxLogSize: parseInt(process.env.MAX_LOG_SIZE || '10485760', 10), // 10MB
    maxLogFiles: parseInt(process.env.MAX_LOG_FILES || '5', 10),
  },
};

// Validate configuration and export
module.exports = validateConfig(config);