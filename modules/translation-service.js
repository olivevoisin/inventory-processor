/**
 * Translation Service Module
 * Handles translation for inventory items
 */
const logger = require('../utils/logger');
const { ExternalServiceError } = require('../utils/error-handler');
const config = require('../config');

// Cache translations to reduce API calls
const translationCache = new Map();

/**
 * Translate text to target language
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<string>} - Translated text
 */
async function translate(text, sourceLanguage = 'ja', targetLanguage = 'fr') {
  try {
    // Return original if empty
    if (!text) return text;
    
    // Check cache
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${text}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }
    
    // In a real implementation, we'd call a translation API
    // For testing, we'll simulate translations
    const translations = {
      'ja': {
        'fr': {
          'ワイン': 'Vin',
          'ビール': 'Bière',
          'ウォッカ': 'Vodka',
          'ウイスキー': 'Whisky',
          'サケ': 'Saké'
        }
      }
    };
    
    // Look up translation
    const sourceLang = translations[sourceLanguage];
    if (!sourceLang) return text;
    
    const targetTranslations = sourceLang[targetLanguage];
    if (!targetTranslations) return text;
    
    const translation = targetTranslations[text] || text;
    
    // Cache the result
    translationCache.set(cacheKey, translation);
    
    return translation;
  } catch (error) {
    logger.error(`Translation error: ${error.message}`);
    return text; // Return original text on error
  }
}

/**
 * Translate multiple texts in batch
 * @param {Array<string>} texts - Array of texts to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Array<string>>} - Array of translated texts
 */
async function batchTranslate(texts, sourceLanguage = 'ja', targetLanguage = 'fr') {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }
  
  try {
    // Translate each text
    const promises = texts.map(text => translate(text, sourceLanguage, targetLanguage));
    return await Promise.all(promises);
  } catch (error) {
    logger.error(`Batch translation error: ${error.message}`);
    throw new ExternalServiceError('Translation', error.message);
  }
}

/**
 * Clear translation cache
 */
function clearCache() {
  translationCache.clear();
}

module.exports = {
  translate,
  batchTranslate,
  clearCache
};
