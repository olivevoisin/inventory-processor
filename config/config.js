/**
 * Application Configuration
 */
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8080,
  googleSheets: {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    docId: process.env.GOOGLE_SHEETS_DOC_ID
  },
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY
  },
  translation: {
    apiKey: process.env.TRANSLATION_API_KEY
  },
  environment: process.env.NODE_ENV || 'development'
};
