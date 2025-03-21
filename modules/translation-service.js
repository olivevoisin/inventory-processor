// modules/translation-service.js
const logger = require('../utils/logger');

// Cache for translations to reduce API calls
const translationCache = new Map();

/**
 * Translate text from one language to another
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language (default: 'ja')
 * @param {string} targetLanguage - Target language (default: 'en')
 * @returns {Promise<string>} - Translated text
 */
async function translateText(text, sourceLanguage = 'ja', targetLanguage = 'en') {
  // Check if we have this translation cached
  const cacheKey = `${sourceLanguage}:${targetLanguage}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  try {
    logger.info(`Translating text from ${sourceLanguage} to ${targetLanguage}`);
    
    // In a real implementation, this would call the Google Translate API
    // But for testing, we'll return mock translations for common Japanese inventory terms
    const translations = {
      'ウォッカ グレイグース': 'Vodka Grey Goose',
      'ワイン カベルネ': 'Wine Cabernet',
      'ジン ボンベイ': 'Gin Bombay',
      'インボイス': 'Invoice',
      '日付': 'Date',
      'アイテム': 'Items',
      '合計': 'Total'
    };
    
    let translatedText = text;
    Object.entries(translations).forEach(([japanese, english]) => {
      translatedText = translatedText.replace(new RegExp(japanese, 'g'), english);
    });
    
    // Cache the result
    translationCache.set(cacheKey, translatedText);
    
    return translatedText;
  } catch (error) {
    logger.error(`Translation error: ${error.message}`);
    throw error;
  }
}

/**
 * Translate an array of invoice items from Japanese to English
 * @param {Array<Object>} items - Array of invoice items
 * @returns {Promise<Array<Object>>} - Translated items
 */
async function translateItems(items) {
  logger.info(`Translating ${items.length} invoice items`);
  
  try {
    const translatedItems = [];
    
    for (const item of items) {
      const translatedProduct = await translateText(item.product);
      
      translatedItems.push({
        ...item,
        product: translatedProduct
      });
    }
    
    return translatedItems;
  } catch (error) {
    logger.error(`Error translating items: ${error.message}`);
    throw error;
  }
}

/**
 * Batch translate a set of items in one call to reduce API calls
 * @param {Array<Object>} items - Array of items to translate
 * @returns {Promise<Array<Object>>} - Translated items
 */
async function batchTranslate(items) {
  // For testing, we'll use the same logic as translateItems
  return translateItems(items);
}

module.exports = {
  translateText,
  translateItems,
  batchTranslate
};
