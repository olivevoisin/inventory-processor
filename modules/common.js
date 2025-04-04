/**
 * Translation Service Module
 * Handles translations for inventory management system
 */
const { Translate } = require('@google-cloud/translate').v2;
const logger = require('../utils/logger');
const config = require('../config');

// Translation cache to reduce API calls
const translationCache = new Map();

// Initialize Google Translate client if API key is available
const googleApiKey = config.translation?.apiKey || process.env.GOOGLE_TRANSLATE_API_KEY;
const translator = googleApiKey ? new Translate({ key: googleApiKey }) : null;

/**
 * Translate text to target language
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code (or 'auto' for auto-detection)
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<string>} - Translated text
 */
async function translate(text, sourceLanguage = 'auto', targetLanguage = 'fr') {
  try {
    // Return original text if empty or target is same as source
    if (!text || sourceLanguage === targetLanguage) {
      return String(text); // Ensure the result is a string
    }
    
    // Check cache first
    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`;
    if (translationCache.has(cacheKey)) {
      return String(translationCache.get(cacheKey)); // Ensure the result is a string
    }
    
    // If no translator is available, return original text
    if (!translator) {
      logger.warn('Translation API not available - returning original text');
      return String(text); // Ensure the result is a string
    }
    
    // Perform translation
    const options = {
      from: sourceLanguage === 'auto' ? null : sourceLanguage,
      to: targetLanguage
    };
    
    const [translation] = await translator.translate(text, options);
    
    // Cache the result
    translationCache.set(cacheKey, translation);
    
    return String(translation); // Ensure the result is a string
  } catch (error) {
    logger.error(`Translation error: ${error.message}`);
    // Return original text on error
    return String(text); // Ensure the fallback is a string
  }
}

/**
 * Translate multiple texts in batch
 * @param {Array<string>} texts - Array of texts to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Array<string>>} - Array of translated texts
 */
async function batchTranslate(texts, sourceLanguage = 'auto', targetLanguage = 'fr') {
  try {
    // Handle empty array
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }
    
    // Return original texts if source and target are the same
    if (sourceLanguage === targetLanguage) {
      return texts.map((text) => String(text)); // Ensure all results are strings
    }
    
    // If no translator is available, return original texts
    if (!translator) {
      logger.warn('Translation API not available - returning original texts');
      return texts.map((text) => String(text)); // Ensure all results are strings
    }
    
    // Perform translations
    const options = {
      from: sourceLanguage === 'auto' ? null : sourceLanguage,
      to: targetLanguage
    };
    
    // Process in smaller batches to avoid API limits
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const translatedBatch = await Promise.all(
        batch.map(async (text) => {
          // Check cache first
          const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`;
          
          if (translationCache.has(cacheKey)) {
            return String(translationCache.get(cacheKey)); // Ensure the result is a string
          }
          
          // Translate if not in cache
          try {
            const [translation] = await translator.translate(text, options);
            translationCache.set(cacheKey, translation);
            return String(translation); // Ensure the result is a string
          } catch (error) {
            logger.error(`Error translating text: ${error.message}`);
            return String(text); // Ensure the fallback is a string
          }
        })
      );
      
      results.push(...translatedBatch);
    }
    
    return results.map((result) => String(result)); // Ensure all results are strings
  } catch (error) {
    logger.error(`Batch translation error: ${error.message}`);
    // Return original texts on error
    return texts.map((text) => String(text)); // Ensure the fallback is an array of strings
  }
}

/**
 * Translate Japanese text to French
 * @param {string} text - Japanese text to translate
 * @returns {Promise<string>} - Translated French text
 */
async function translateJapaneseToFrench(text) {
  return translate(text, 'ja', 'fr');
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
  translateJapaneseToFrench,
  clearCache
};

/**
 * Common Middleware Module
 * Sets up standard middleware for the application
 */
function setupMiddleware(app) {
  app.use(require('body-parser').json());
  app.use(require('cors')());
  app.use(require('helmet')());
}

module.exports = {
  setupMiddleware,
};