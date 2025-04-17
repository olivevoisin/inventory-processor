/**
 * Module de service de traduction
 * Gère les traductions entre différentes langues pour l'inventaire
 */
const logger = require('../utils/logger');
const config = require('../config'); // Import config
let Translate; // Variable to hold the Translate class

// --- Start: Conditional Google Cloud Client Initialization ---
let translateClient = null;
if (!config.testMockTranslate) {
  try {
    // Only require the real library if not using the internal mock
    ({ Translate } = require('@google-cloud/translate').v2);
    if (config.googleCloud?.projectId && config.googleCloud?.keyFilename) {
      translateClient = new Translate({
        projectId: config.googleCloud.projectId,
        keyFilename: config.googleCloud.keyFilename,
      });
      logger.info('Google Translate client initialized.');
    } else {
      // Attempt to initialize without explicit credentials (useful for GCE/Cloud Run)
      translateClient = new Translate();
      logger.info('Google Translate client initialized using default credentials.');
    }
  } catch (err) {
    logger.error(`Failed to initialize Google Translate client: ${err.message}. Translation service might not work correctly.`);
    // Set translateClient to null to indicate failure
    translateClient = null;
  }
} else {
  logger.warn('Using internal mock for translation service.');
}
// --- End: Conditional Google Cloud Client Initialization ---

// Cache pour les traductions
const translationCache = new Map();

// Dictionnaire de traduction simplifiée pour les tests (Only used if config.testMockTranslate is true)
// Ensure keys are lowercase for consistent lookup
const translations = {
  // Japonais -> Français
  ja: {
    'ウォッカ グレイグース': 'Vodka Grey Goose',
    'ワイン カベルネ': 'Vin Cabernet',
    'ジン ボンベイ': 'Gin Bombay',
    'ウイスキー': 'Whisky',
    'ビール': 'Bière',
    'チョコレート': 'Chocolat',
    'ボックス': 'Box',
    'ウォッカ': 'Vodka',
    '5本のワイン': '5 bouteilles de vin',
    '3缶のビール': '3 cannettes de bière',
    'チョコレートの箱': 'box de chocolat',
    'インボイス': 'Facture',
    '日付': 'Date',
    'アイテム': 'Articles',
    '合計': 'Total'
  },
  // Français -> Anglais (pour les tests) - Use lowercase keys
  fr: {
    'vin rouge': 'red wine',
    'vin blanc': 'white wine',
    'bière': 'beer',
    'bière blonde': 'light beer',
    'vodka': 'vodka',
    'whisky': 'whiskey',
    'chocolat': 'chocolate',
    'bouteille de vin': 'bottle of wine',
    'cannette de bière': 'can of beer',
    'boîte de chocolat': 'box of chocolate'
  }
};

/**
 * Détecte la langue du texte
 * @param {string} text - Texte à analyser
 * @returns {Promise<string>} - Code de langue détecté ('ja', 'en', 'fr', etc.)
 */
async function detectLanguage(text) {
  if (!text) return 'en'; // Default for empty text

  // --- Use Google Cloud client if available and not mocking ---
  if (translateClient && !config.testMockTranslate) {
    try {
      const [detections] = await translateClient.detect(text);
      const detection = Array.isArray(detections) ? detections[0] : detections;
      return detection?.language && detection.language !== 'und' ? detection.language : 'en';
    } catch (error) {
      logger.error(`Error detecting language via API: ${error.message}`, error);
      // --- DO NOT re-throw, proceed to fallback ---
    }
  }
  // --- End Google Cloud client usage ---

  // --- Internal Mock/Fallback Detection ---
  const japanesePattern = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]/;
  // Broader check for French: accents OR common words (case-insensitive)
  const frenchPattern = /[éèêëàâäôöùûüïîçñÉÈÊËÀÂÄÔÖÙÛÜÏÎÇÑ]/i;
  const commonFrenchWords = /\b(le|la|les|un|une|des|de|du|et|ou|est|sont|bonjour|merci|vin|bière)\b/i;

  if (japanesePattern.test(text)) {
    return 'ja';
  } else if (frenchPattern.test(text) || commonFrenchWords.test(text)) { // Updated condition
    return 'fr';
  } else {
    return 'en'; // Default
  }
  // --- End Internal Mock/Fallback Detection ---
}

/**
 * Traduit un texte d'une langue à une autre
 * @param {string} text - Texte à traduire
 * @param {string} sourceLanguage - Langue source (auto, en, ja, fr)
 * @param {string} targetLanguage - Langue cible (en, ja, fr)
 * @returns {Promise<string>} - Texte traduit
 */
async function translate(text, sourceLanguage = 'auto', targetLanguage = 'fr') {
  if (!text) return '';

  // --- Determine actual source language ---
  let actualSourceLanguage = sourceLanguage;
  if (sourceLanguage === 'auto') {
    try {
      actualSourceLanguage = await detectLanguage(text);
    } catch (detectError) {
      // If detection fails (even API detection), log and default to 'en' for fallback
      logger.error(`Auto-detection failed during translate: ${detectError.message}. Using 'en' for fallback.`, detectError);
      actualSourceLanguage = 'en'; // Default to 'en' if detection fails
    }
  }
  // --- End Determine actual source language ---

  if (actualSourceLanguage === targetLanguage) return text;

  const cacheKey = `${text}_${actualSourceLanguage}_${targetLanguage}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // --- Use Google Cloud client if available and not mocking ---
  if (translateClient && !config.testMockTranslate) {
    try {
      const options = {
        from: actualSourceLanguage,
        to: targetLanguage,
      };
      const [translationResult] = await translateClient.translate(text, options);
      translationCache.set(cacheKey, translationResult);
      return translationResult;
    } catch (error) {
      logger.error(`Error translating text via API: ${error.message}`, error);
      // --- DO NOT re-throw, proceed to fallback ---
    }
  }
  // --- End Google Cloud client usage ---

  // --- Internal Mock/Fallback Logic ---
  if (config.testMockTranslate) {
    // Use internal dictionary only if testMockTranslate is true
    // Use lowercase for lookup
    const lookupKey = text.toLowerCase();
    if (translations[actualSourceLanguage] && translations[actualSourceLanguage][lookupKey]) {
      const translatedResult = translations[actualSourceLanguage][lookupKey];
      translationCache.set(cacheKey, translatedResult);
      return translatedResult;
    }
  }

  // Default mock/fallback format if no specific mock or API failed
  const translatedText = `[${targetLanguage}] ${text}`;
  translationCache.set(cacheKey, translatedText);
  return translatedText;
  // --- End Internal Mock/Fallback Logic ---
}

/**
 * Traduit des textes en lot
 * @param {Array<string>} texts - Textes à traduire
 * @param {string} sourceLanguage - Langue source (auto, en, ja, fr)
 * @param {string} targetLanguage - Langue cible (en, ja, fr)
 * @returns {Promise<Array<string>>} - Textes traduits
 */
async function batchTranslate(texts, sourceLanguage = 'auto', targetLanguage = 'fr') {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  // --- Determine actual source language ---
  let actualSourceLanguage = sourceLanguage;
  if (sourceLanguage === 'auto') {
    try {
      // Detect based on the first non-empty text
      const firstText = texts.find(t => !!t) || '';
      actualSourceLanguage = await detectLanguage(firstText);
    } catch (detectError) {
      logger.error(`Auto-detection failed during batchTranslate: ${detectError.message}. Using 'en' for fallback.`, detectError);
      actualSourceLanguage = 'en'; // Default to 'en' if detection fails
    }
  }
  // --- End Determine actual source language ---

  if (actualSourceLanguage === targetLanguage) {
    return [...texts];
  }

  // --- Use Google Cloud client if available and not mocking ---
  if (translateClient && !config.testMockTranslate) {
    try {
      const options = {
        from: actualSourceLanguage,
        to: targetLanguage,
      };
      const [translationsResult] = await translateClient.translate(texts, options);
      return Array.isArray(translationsResult) ? translationsResult : [translationsResult];
    } catch (error) {
      logger.error(`Error batch translating texts via API: ${error.message}`, error);
      // --- DO NOT re-throw, proceed to fallback ---
    }
  }
  // --- End Google Cloud client usage ---

  // --- Internal Mock/Fallback Logic ---
  // Fallback: translate individually using the translate function
  const promises = texts.map(text => translate(text, actualSourceLanguage, targetLanguage));
  return await Promise.all(promises);
  // --- End Internal Mock/Fallback Logic ---
}

/**
 * Traduit du japonais vers le français (fonction spécifique)
 * @param {string} japaneseText - Texte japonais à traduire
 * @returns {Promise<string>} - Texte traduit en français
 */
async function translateJapaneseToFrench(japaneseText) {
  return translate(japaneseText, 'ja', 'fr');
}

/**
 * Traduit les éléments d'une facture
 * @param {Array} items - Éléments de la facture à traduire
 * @param {string} sourceLanguage - Langue source (auto, en, ja, fr)
 * @param {string} targetLanguage - Langue cible (en, ja, fr)
 * @returns {Promise<Array>} - Éléments traduits
 */
async function translateItems(items, sourceLanguage = 'auto', targetLanguage = 'fr') {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const translatedItems = [];
    for (const item of items) {
      const productName = item.product || item.product_name || item.name || '';
      if (!productName) {
        translatedItems.push(item);
        continue;
      }
      // Use the updated translate function which handles API/mock/fallback logic
      const translatedName = await translate(productName, sourceLanguage, targetLanguage);
      translatedItems.push({
        ...item,
        original_name: productName, // Store original name
        translated_name: translatedName // Store potentially translated name
      });
    }
    return translatedItems;
  } catch (error) {
    logger.error(`Erreur lors de la traduction des éléments: ${error.message}`);
    return items; // Return original items on error
  }
}

/**
 * Efface le cache de traduction
 * Utile pour les tests pour assurer des conditions initiales propres
 */
function clearCache() {
  translationCache.clear();
}

module.exports = {
  translate,
  batchTranslate,
  translateJapaneseToFrench,
  detectLanguage,
  clearCache,
  translateItems
};
