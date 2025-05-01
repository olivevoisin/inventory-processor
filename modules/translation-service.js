const logger = require('../utils/logger');
const config = require('../config');

let googleTranslateClient;
let cache = {};

// Initialize client eagerly on module load
getGoogleTranslateClient();

function getGoogleTranslateClient() {
  if (googleTranslateClient !== undefined) {
    return googleTranslateClient;
  }
  try {
    const { v2 } = require('@google-cloud/translate');
    googleTranslateClient = new v2.Translate({
      projectId: config.googleCloud.projectId,
      keyFilename: config.googleCloud.keyFilename,
    });
    logger.info('Google Translate client initialized successfully.');
  } catch (err) {
    logger.error(`Failed to initialize Google Translate client: ${err.message}`, err);
    googleTranslateClient = null;
  }
  return googleTranslateClient;
}

function getCacheKey(text, sourceLanguage, targetLanguage) {
  const src = sourceLanguage || 'unknown';
  const tgt = targetLanguage || 'unknown';
  return `${src}:${tgt}:${text}`;
}

function clearCache() {
  cache = {};
  logger.info('Translation cache cleared.');
}

async function detectLanguage(text) {
  if (typeof text !== 'string' || text === '') {
    logger.warn('detectLanguage called with empty or non-string input.');
    throw new Error('Cannot detect language of empty or non-string text.');
  }
  if (config.testMockTranslate) {
    logger.debug('Detect language (mock mode): returning "en"');
    return 'en';
  }
  const client = getGoogleTranslateClient();
  if (!client) {
    logger.error('Cannot detect language: Google Translate client not initialized');
    throw new Error('Google Translate client not initialized');
  }
  try {
    const [detections] = await client.detect(text);
    const detectedLang = Array.isArray(detections) ? detections[0]?.language : detections?.language;
    if (!detectedLang) {
      logger.error(`Detection API returned unexpected format for text "${text.substring(0, 20)}...". Result: ${JSON.stringify(detections)}`);
      throw new Error('Detection result format unexpected or language missing.');
    }
    logger.debug(`Detected language: ${detectedLang} for text: "${text.substring(0, 20)}..."`);
    return detectedLang;
  } catch (err) {
    logger.error(`Error detecting language via API for "${text.substring(0, 20)}...": ${err.message}`, err);
    throw err;
  }
}

async function translate(text, sourceLanguage, targetLanguage) {
  if (typeof text !== 'string') {
    logger.warn(`Translate called with non-string input: ${typeof text}. Returning empty string.`);
    return '';
  }
  if (text === '') {
    logger.debug('Translate called with empty string, returning empty string.');
    return '';
  }
  if (!targetLanguage) {
    logger.error('Translate called without targetLanguage. Cannot proceed.');
    throw new Error('Target language must be specified.');
  }
  const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
  if (cache[cacheKey] !== undefined) {
    logger.debug(`Cache hit for key: ${cacheKey}`);
    return cache[cacheKey];
  }
  logger.debug(`Cache miss for key: ${cacheKey}`);

  if (config.testMockTranslate) {
    logger.debug(`Translate (mock mode): "${text}" from ${sourceLanguage} to ${targetLanguage}`);
    const result = `[API-${targetLanguage}] ${text}`;
    cache[cacheKey] = result;
    return result;
  }

  const client = getGoogleTranslateClient();
  if (!client) {
    logger.error('Cannot translate: Google Translate client not initialized. Returning fallback.');
    const fallbackResult = `[API-${targetLanguage}] ${text}`;
    cache[cacheKey] = fallbackResult;
    return fallbackResult;
  }

  try {
    let fromLang = sourceLanguage;
    if (sourceLanguage === 'auto') {
      logger.debug(`Attempting auto-detection for text: "${text.substring(0, 20)}..."`);
      try {
        fromLang = await detectLanguage(text);
      } catch (detectErr) {
        logger.warn(`Failed to auto-detect language for "${text.substring(0, 20)}...", falling back to 'en'. Error: ${detectErr.message}`);
        fromLang = 'en';
      }
    }
    if (fromLang === targetLanguage) {
      logger.debug(`Source (${fromLang}) and target (${targetLanguage}) languages match. Returning original text.`);
      cache[cacheKey] = text;
      return text;
    }
    logger.debug(`Translating "${text.substring(0, 20)}..." from ${fromLang} to ${targetLanguage}`);
    const [translated] = await client.translate(text, { from: fromLang, to: targetLanguage });
    const result = typeof translated === 'string' ? translated : `[API-${targetLanguage}] ${text}`;
    if (typeof translated !== 'string') {
      logger.warn(`Translation API returned non-string result (${typeof translated}) for "${text.substring(0, 20)}...". Falling back to fallback format.`);
    }
    logger.debug(`Translation successful for "${text.substring(0, 20)}...": "${result.substring(0, 20)}..."`);
    cache[cacheKey] = result;
    return result;
  } catch (err) {
    logger.error(`Error during translation API call for "${text.substring(0, 20)}...": ${err.message}`, err);
    logger.warn(`Translation failed for "${text.substring(0, 20)}...". Returning fallback.`);
    const fallbackResult = `[API-${targetLanguage}] ${text}`;
    cache[cacheKey] = fallbackResult;
    return fallbackResult;
  }
}

async function batchTranslate(texts, sourceLanguage, targetLanguage) {
  if (!Array.isArray(texts)) {
    logger.warn('batchTranslate called with non-array input. Returning empty array.');
    return [];
  }
  const validTexts = texts.filter(t => typeof t === 'string' && t !== '');
  if (validTexts.length === 0) {
    logger.debug('batchTranslate called with empty array or array containing only empty/non-string elements. Returning empty array.');
    return [];
  }
  if (validTexts.length < texts.length) {
    logger.warn(`batchTranslate filtered out ${texts.length - validTexts.length} invalid (empty/non-string) elements.`);
  }
  if (config.testMockTranslate) {
    logger.debug(`Batch translate (mock mode): ${validTexts.length} items to ${targetLanguage}`);
    return validTexts.map(text => `[API-${targetLanguage}] ${text}`);
  }
  const client = getGoogleTranslateClient();
  if (!client) {
    logger.error('Cannot batch translate: Google Translate client not initialized.');
    logger.warn('Falling back to individual translations due to uninitialized client.');
    return batchTranslateFallback(validTexts, sourceLanguage, targetLanguage);
  }
  try {
    logger.debug(`Attempting batch translation for ${validTexts.length} items from ${sourceLanguage} to ${targetLanguage}`);
    const [translated] = await client.translate(validTexts, { from: sourceLanguage, to: targetLanguage });
    if (!Array.isArray(translated) || translated.length !== validTexts.length) {
      logger.error(`Batch translation API returned unexpected result format or length. Expected array of length ${validTexts.length}, got: ${JSON.stringify(translated)}`);
      throw new Error('Batch translation API returned unexpected result.');
    }
    logger.debug(`Batch translation successful for ${validTexts.length} items.`);
    return translated;
  } catch (err) {
    logger.error(`Batch translation failed: ${err.message}. Falling back to individual translations.`, err);
    return batchTranslateFallback(validTexts, sourceLanguage, targetLanguage);
  }
}

async function batchTranslateFallback(texts, sourceLanguage, targetLanguage) {
  const results = [];
  logger.debug(`Executing batch fallback: translating ${texts.length} items individually.`);
  for (const text of texts) {
    try {
      const result = await translate(text, sourceLanguage, targetLanguage);
      results.push(result);
    } catch (err) {
      logger.error(`Error during individual fallback translation for "${text.substring(0,20)}...": ${err.message}`, err);
      results.push(`[API-${targetLanguage}] ${text}`);
    }
  }
  logger.debug(`Batch fallback completed for ${texts.length} items.`);
  return results;
}

async function translateItems(items, sourceLanguage, targetLanguage) {
  if (!Array.isArray(items)) {
    logger.warn('translateItems: Input is not an array. Returning empty array.');
    return [];
  }
  if (items.length === 0) {
    logger.debug('translateItems: Input array is empty. Returning empty array.');
    return [];
  }
  logger.debug(`Translating items: ${items.length} items from ${sourceLanguage} to ${targetLanguage}`);
  const translatedItems = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      logger.warn(`translateItems: Skipping invalid item at index ${i}. Item: ${JSON.stringify(item)}`);
      translatedItems.push(item);
      continue;
    }
    const originalName = item.product;
    if (typeof originalName !== 'string' || originalName === '') {
      logger.debug(`translateItems: Skipping item at index ${i} due to missing/empty/invalid 'product' property.`);
      translatedItems.push({
        ...item,
        original_name: originalName || '',
        translated_name: originalName || ''
      });
      continue;
    }
    let translatedName;
    try {
      translatedName = await translate(originalName, sourceLanguage, targetLanguage);
    } catch (error) {
      logger.error(
        `Unexpected error processing item '${originalName}' in translateItems loop: ${error.message}`,
        error
      );
      translatedName = `[API-${targetLanguage}] ${originalName}`;
    }
    translatedItems.push({
      ...item,
      original_name: originalName,
      translated_name: translatedName
    });
  }
  logger.debug(`translateItems finished processing ${items.length} items.`);
  return translatedItems;
}

async function translateJapaneseToFrench(text) {
  if (typeof text !== 'string' || text === '') {
    logger.warn('translateJapaneseToFrench called with empty or non-string input.');
    return '';
  }
  logger.debug(`Translating Japanese to French: "${text.substring(0, 20)}..."`);
  return translate(text, 'ja', 'fr');
}

module.exports = {
  detectLanguage,
  translate,
  batchTranslate,
  translateItems,
  clearCache,
  translateJapaneseToFrench,
};