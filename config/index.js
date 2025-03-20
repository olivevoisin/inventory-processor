// config/index.js
const config = {
  // Server configuration
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Google API configuration
  google: {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    inventorySheetId: process.env.INVENTORY_SHEET_ID
  },
  
  // Voice processing configuration
  voiceProcessing: {
    deepgramApiKey: process.env.DEEPGRAM_API_KEY
  },
  
  // Translation configuration
  translation: {
    service: 'google',
    google: {
      apiKey: process.env.GOOGLE_TRANSLATE_API_KEY
    }
  },
  
  // Notification configuration
  notifications: {
    enabled: process.env.ENABLE_NOTIFICATIONS !== 'false',
    email: process.env.ADMIN_EMAIL
  }
};

console.log("Configuration loaded:", {
  port: config.port,
  nodeEnv: config.nodeEnv,
  hasGoogleSheetsApiKey: !!config.google.apiKey,
  hasInventorySheetId: !!config.google.inventorySheetId,
  hasDeepgramApiKey: !!config.voiceProcessing.deepgramApiKey,
  hasTranslateApiKey: !!config.translation.google.apiKey,
  notificationsEnabled: config.notifications.enabled
});

module.exports = config;