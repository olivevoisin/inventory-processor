
// Application configuration

const path = require('path');
require('dotenv').config();

// Environment variables with defaults
const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    uri: process.env.DATABASE_URI || 'mongodb://localhost:27017/inventory-app',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Voice processing configuration
  voiceProcessing: {
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    confidenceThreshold: parseFloat(process.env.VOICE_CONFIDENCE_THRESHOLD || '0.85'),
    uploadDirectory: process.env.VOICE_UPLOAD_DIR || path.join(__dirname, 'uploads/audio')
  },
  
  // Invoice processing configuration
  invoiceProcessing: {
    directory: process.env.INVOICE_DIR || path.join(__dirname, 'data/invoices/incoming'),
    archiveProcessed: process.env.ARCHIVE_PROCESSED_INVOICES !== 'false',
    schedule: process.env.INVOICE_PROCESSING_SCHEDULE || '0 2 1,15 * *', // 2 AM on 1st and 15th
    schedulerEnabled: process.env.ENABLE_INVOICE_SCHEDULER !== 'false',
    notifyOnCompletion: process.env.NOTIFY_ON_COMPLETION !== 'false'
  },
  
  // Translation service configuration
  translation: {
    service: process.env.TRANSLATION_SERVICE || 'google', // 'google', 'azure', or 'deepl'
    google: {
      apiKey: process.env.GOOGLE_TRANSLATE_API_KEY
    },
    azure: {
      apiKey: process.env.AZURE_TRANSLATOR_API_KEY,
      region: process.env.AZURE_TRANSLATOR_REGION || 'global'
    },
    deepl: {
      apiKey: process.env.DEEPL_API_KEY
    }
  },
  
  // Notification configuration
  notifications: {
    enabled: process.env.ENABLE_NOTIFICATIONS !== 'false',
    email: {
      service: process.env.EMAIL_SERVICE || 'smtp',
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      from: process.env.EMAIL_FROM || 'inventory-app@example.com',
      to: process.env.ADMIN_EMAIL
    },
    slack: {
      enabled: process.env.ENABLE_SLACK_NOTIFICATIONS === 'true',
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#inventory-alerts'
    }
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.FILE_LOGGING !== 'false',
      directory: process.env.LOG_DIR || path.join(__dirname, 'logs'),
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10)
    }
  }
};

// Validate required configuration
function validateConfig() {
  const errors = [];
  
  // Check voice processing configuration
  if (config.voiceProcessing.deepgramApiKey === undefined) {
    errors.push('DEEPGRAM_API_KEY is required for voice processing');
  }
  
  // Check translation service configuration
  if (config.translation.service === 'google' && !config.translation.google.apiKey) {
    errors.push('GOOGLE_TRANSLATE_API_KEY is required when using Google translation');
  } else if (config.translation.service === 'azure' && !config.translation.azure.apiKey) {
    errors.push('AZURE_TRANSLATOR_API_KEY is required when using Azure translation');
  } else if (config.translation.service === 'deepl' && !config.translation.deepl.apiKey) {
    errors.push('DEEPL_API_KEY is required when using DeepL translation');
  }
  
  // Check notification configuration
  if (config.notifications.enabled && !config.notifications.email.to) {
    errors.push('ADMIN_EMAIL is required when notifications are enabled');
  }
  
  // Log configuration errors
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`- ${error}`));
    
    // Only exit in production; in development, we might want to continue
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }
}

// Skip validation in test environment
if (config.nodeEnv !== 'test') {
  validateConfig();
}

module.exports = config;