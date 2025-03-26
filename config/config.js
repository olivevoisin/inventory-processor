/**
 * Configuration de l'application
 * Centralise les paramètres de configuration pour l'application
 */
require('dotenv').config();

// Configuration par défaut
const config = {
  // Informations sur l'application
  appName: 'Système de Gestion d\'Inventaire',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Configuration du serveur
  port: process.env.PORT || 8080,
  host: process.env.HOST || 'localhost',
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  
  // Configuration de l'API
  apiVersion: 'v1',
  apiKeys: (process.env.API_KEYS || '').split(',').filter(Boolean),
  
  // Dossiers d'uploads
  uploads: {
    baseDir: process.env.UPLOAD_DIR || './uploads',
    voiceDir: process.env.VOICE_UPLOAD_DIR || './uploads/voice',
    invoiceDir: process.env.INVOICE_UPLOAD_DIR || './uploads/invoices',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB
  },
  
  // Configuration de la journalisation
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE !== 'false',
      directory: process.env.LOG_DIR || './logs',
      maxSize: process.env.LOG_MAX_SIZE || '5mb',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)
    }
  },
  
  // Traitement vocal
  voiceProcessing: {
    deepgramApiKey: process.env.DEEPGRAM_API_KEY,
    language: process.env.VOICE_LANGUAGE || 'fr',
    modelName: process.env.VOICE_MODEL || 'nova-2',
    schedulerEnabled: process.env.VOICE_SCHEDULER_ENABLED === 'true'
  },
  
  // Traduction
  translation: {
    enabled: process.env.TRANSLATION_ENABLED !== 'false',
    apiKey: process.env.TRANSLATION_API_KEY,
    defaultSourceLang: process.env.DEFAULT_SOURCE_LANG || 'auto',
    defaultTargetLang: process.env.DEFAULT_TARGET_LANG || 'fr'
  },
  
  // Google Sheets
  googleSheets: {
    enabled: process.env.GOOGLE_SHEETS_ENABLED !== 'false',
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY ? 
      process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    docId: process.env.GOOGLE_SHEETS_DOC_ID,
    sheetTitles: {
      products: process.env.GOOGLE_SHEETS_PRODUCTS_TITLE || 'Produits',
      inventory: process.env.GOOGLE_SHEETS_INVENTORY_TITLE || 'Inventaire'
    }
  },
  
  // Traitement des factures
  invoiceProcessing: {
    enabled: process.env.INVOICE_PROCESSING_ENABLED !== 'false',
    crawlEnabled: process.env.INVOICE_CRAWL_ENABLED !== 'false',
    crawlDirectory: process.env.INVOICE_CRAWL_DIRECTORY || './invoices',
    schedule: process.env.INVOICE_PROCESSING_SCHEDULE || '0 0 * * *', // Par défaut: tous les jours à minuit
    schedulerEnabled: process.env.INVOICE_SCHEDULER_ENABLED === 'true'
  },
  
  // Internationalisation
  i18n: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'fr',
    availableLanguages: (process.env.AVAILABLE_LANGUAGES || 'fr,en').split(',')
  },
  
  // Emplacements d'inventaire
  locations: [
    'cuisine_maison',
    'cuisine_bicoque',
    'boisson_bicoque',
    'boisson_maison'
  ]
};

// Validation de la configuration
function validateConfig() {
  const requiredKeys = [
    'appName',
    'port'
  ];
  
  const missingKeys = requiredKeys.filter(key => !config[key]);
  
  if (missingKeys.length > 0) {
    console.error(`Configuration invalide. Clés manquantes: ${missingKeys.join(', ')}`);
    process.exit(1);
  }
  
  // Valider les répertoires d'upload
  require('fs').mkdirSync(config.uploads.baseDir, { recursive: true });
  require('fs').mkdirSync(config.uploads.voiceDir, { recursive: true });
  require('fs').mkdirSync(config.uploads.invoiceDir, { recursive: true });
  
  return true;
}

// Valider la configuration au démarrage
validateConfig();

module.exports = config;
