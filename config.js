/**
 * Configuration de l'application
 */
require('dotenv').config();

const config = {
  // Configuration du serveur
  port: process.env.PORT || 8080,
  environment: process.env.NODE_ENV || 'development',
  version: process.env.VERSION || '1.0.0',
  appName: 'Système de Gestion d\'Inventaire',
  
  // Répertoires d'upload
  uploads: {
    voiceDir: process.env.VOICE_UPLOAD_DIR || './uploads/voice',
    invoiceDir: process.env.INVOICE_UPLOAD_DIR || './uploads/invoices'
  },
  
  // Configuration du traitement des factures
  invoiceSourceDir: process.env.INVOICE_SOURCE_DIR || './uploads/invoices',
  invoiceProcessedDir: process.env.INVOICE_PROCESSED_DIR || './uploads/invoices/processed',
  invoiceSchedule: process.env.INVOICE_SCHEDULE || '0 0 * * *', // Minuit tous les jours
  
  // Emplacements d'inventaire
  locations: [
    'cuisine_maison',
    'cuisine_bicoque',
    'boisson_bicoque',
    'boisson_maison'
  ],
  
  // Configuration Google Sheets
  googleSheets: {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    docId: process.env.GOOGLE_SHEETS_DOC_ID,
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY
      ? process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined
  },
  
  // Configuration de journalisation
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE === 'true',
      directory: process.env.LOG_DIR || './logs',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10)
    }
  }
};

module.exports = config;
