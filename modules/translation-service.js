// modules/translation-service.js

const { Translate } = require('@google-cloud/translate').v2;
const NodeCache = require('node-cache');
const config = require('../config');
const logger = require('../utils/logger');
const { ExternalServiceError } = require('../utils/error-handler');
const { retry } = require('../utils/retry');

class TranslationService {
  constructor() {
    this.cacheEnabled = true;
    this.cacheExpiration = 86400; // 24 hours by default (in seconds)
    this.cache = new NodeCache({ 
      stdTTL: this.cacheExpiration,
      checkperiod: 600 // Check for expired keys every 10 minutes
    });
    
    // Initialize Google Translate client
    this.translateClient = new Translate({
      projectId: config.googleTranslate.projectId,
      keyFilename: config.googleTranslate.keyFilename
    });
    
    // If API key is provided instead of service account
    if (config.googleTranslate.apiKey) {
      this.translateClient = new Translate({
        key: config.googleTranslate.apiKey
      });
    }
    
    logger.info('Translation service initialized', {
      module: 'translation-service',
      cacheEnabled: this.cacheEnabled,
      cacheExpiration: this.cacheExpiration
    });
  }
  
  /**
   * Translate a single text string
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code (e.g., 'ja' for Japanese)
   * @param {string} targetLanguage - Target language code (e.g., 'fr' for French)
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<string>} Translated text
   */
  async translate(text, sourceLanguage, targetLanguage, requestId) {
    if (!text || text.trim() === '') {
      return '';
    }
    
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${text}`;
    
    // Check cache first
    if (this.cacheEnabled) {
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        logger.debug('Translation cache hit', {
          module: 'translation-service',
          requestId,
          text: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
          sourceLanguage,
          targetLanguage
        });
        return cachedResult;
      }
    }
    
    logger.info('Translating text', {
      module: 'translation-service',
      requestId,
      text: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
      sourceLanguage,
      targetLanguage
    });
    
    try {
      // Call Google Translate API with retry logic
      const [translation] = await retry(
        () => this.translateClient.translate(text, {
          from: sourceLanguage,
          to: targetLanguage
        }),
        {
          maxRetries: config.retries.maxRetries,
          initialDelay: config.retries.initialDelay,
          maxDelay: config.retries.maxDelay,
          onRetry: (error, attempt) => {
            logger.warn(`Retrying translation (${attempt}/${config.retries.maxRetries})`, {
              module: 'translation-service',
              requestId,
              error: error.message
            });
          }
        }
      );
      
      logger.info('Translation completed', {
        module: 'translation-service',
        requestId,
        sourceLanguage,
        targetLanguage
      });
      
      // Store in cache
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, translation);
      }
      
      return translation;
    } catch (error) {
      logger.error('Translation failed', {
        module: 'translation-service',
        requestId,
        sourceLanguage,
        targetLanguage,
        error: error.message
      });
      
      throw new ExternalServiceError(
        `Translation failed: ${error.message}`,
        'google-translate',
        'TRANSLATION_ERROR'
      );
    }
  }
  
  /**
   * Translate multiple texts in batch
   * @param {Array<string>} texts - Array of texts to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<Array<string>>} Array of translated texts
   */
  async translateBatch(texts, sourceLanguage, targetLanguage, requestId) {
    if (!texts || texts.length === 0) {
      return [];
    }
    
    logger.info(`Translating batch of ${texts.length} texts`, {
      module: 'translation-service',
      requestId,
      count: texts.length,
      sourceLanguage,
      targetLanguage
    });
    
    // For small batches, we can translate in parallel
    if (texts.length <= 5) {
      try {
        const promises = texts.map(text => 
          this.translate(text, sourceLanguage, targetLanguage, requestId)
        );
        
        return await Promise.all(promises);
      } catch (error) {
        logger.error('Batch translation failed', {
          module: 'translation-service',
          requestId,
          error: error.message
        });
        
        throw new ExternalServiceError(
          `Batch translation failed: ${error.message}`,
          'google-translate',
          'BATCH_TRANSLATION_ERROR'
        );
      }
    }
    
    // For larger batches, we translate in chunks to avoid rate limits
    const results = [];
    const chunkSize = 5;
    
    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      
      try {
        logger.debug(`Translating batch chunk ${i/chunkSize + 1}/${Math.ceil(texts.length/chunkSize)}`, {
          module: 'translation-service',
          requestId,
          chunkSize: chunk.length
        });
        
        const chunkResults = await Promise.all(
          chunk.map(text => this.translate(text, sourceLanguage, targetLanguage, requestId))
        );
        
        results.push(...chunkResults);
        
        // Small delay between chunks to avoid rate limits
        if (i + chunkSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        logger.error(`Chunk translation failed at index ${i}`, {
          module: 'translation-service',
          requestId,
          error: error.message
        });
        
        // Continue with other chunks instead of failing completely
        // Fill in missing translations with empty strings
        results.push(...new Array(chunk.length).fill(''));
      }
    }
    
    logger.info('Batch translation completed', {
      module: 'translation-service',
      requestId,
      totalTranslated: results.length
    });
    
    return results;
  }
  
  /**
   * Clear the translation cache
   * @returns {number} Number of cache entries cleared
   */
  clearCache() {
    const count = this.cache.keys().length;
    this.cache.flushAll();
    
    logger.info(`Translation cache cleared (${count} entries)`, {
      module: 'translation-service'
    });
    
    return count;
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      enabled: this.cacheEnabled,
      expiration: this.cacheExpiration
    };
  }
}

// Export singleton instance
module.exports = new TranslationService();