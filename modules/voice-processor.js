// modules/voice-processor.js

const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');
const { DatabaseError, ExternalServiceError, ValidationError } = require('../utils/error-handler');
const database = require('../utils/database-utils');
const { retry } = require('../utils/retry');
const { Deepgram } = require('@deepgram/sdk');

class VoiceProcessor {
  constructor() {
    this.deepgramApiKey = config.deepgram.apiKey;
    this.model = config.deepgram.model;
    this.language = config.deepgram.language;
    
    // Validate required configuration
    if (!this.deepgramApiKey) {
      throw new Error('Deepgram API key is required for voice processing');
    }
    
    // Initialize Deepgram client
    this.deepgram = new Deepgram(this.deepgramApiKey);
    
    logger.info('Voice processor initialized', { 
      module: 'voice-processor',
      model: this.model,
      language: this.language
    });
  }
  
  /**
   * Process audio file for inventory updates
   * @param {string} filePath - Path to the audio file
   * @param {Object} options - Processing options
   * @param {string} options.inventoryLocation - Location for inventory (default: 'main')
   * @returns {Promise<Object>} Processing results with transcription and identified products
   */
  async processAudioFile(filePath, options = {}) {
    const timer = logger.startTimer();
    const requestId = options.requestId || `voice-${Date.now()}`;
    
    logger.info('Processing audio file', { 
      module: 'voice-processor',
      filePath,
      options,
      requestId
    });
    
    try {
      // 1. Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new ValidationError(`File not found: ${filePath}`, ['filePath'], 'FILE_NOT_FOUND');
      }
      
      // 2. Perform speech-to-text using Deepgram
      const audioBuffer = fs.readFileSync(filePath);
      const transcriptionResponse = await retry(
        () => this.transcribeAudio(audioBuffer),
        {
          maxRetries: config.retries.maxRetries,
          initialDelay: config.retries.initialDelay,
          maxDelay: config.retries.maxDelay,
          onRetry: (error, attempt) => {
            logger.warn(`Retrying transcription (${attempt}/${config.retries.maxRetries})`, {
              module: 'voice-processor',
              requestId,
              error: error.message
            });
          }
        }
      );
      
      // 3. Extract inventory information from transcription
      const inventoryItems = this.extractInventoryItems(transcriptionResponse);
      
      // 4. Match with product database
      const inventoryLocation = options.inventoryLocation || 'main';
      const matchedProducts = await this.matchProductsInDatabase(
        inventoryItems, 
        inventoryLocation,
        requestId
      );
      
      // 5. Prepare result
      const result = {
        transcription: transcriptionResponse.results?.channels[0]?.alternatives[0]?.transcript || '',
        confidence: transcriptionResponse.results?.channels[0]?.alternatives[0]?.confidence || 0,
        inventoryItems,
        matchedProducts,
        processingTime: timer.end()
      };
      
      logger.info('Audio processing completed successfully', {
        module: 'voice-processor',
        requestId,
        duration: result.processingTime,
        itemsFound: matchedProducts.length
      });
      
      return result;
    } catch (error) {
      const duration = timer.end();
      logger.error('Audio processing failed', {
        module: 'voice-processor',
        requestId,
        duration,
        filePath,
        error: error.message,
        stack: error.stack
      });
      
      // Convert generic errors to our error types
      if (error.name === 'DeepgramApiError' || error.name === 'DeepgramError') {
        throw new ExternalServiceError(
          `Deepgram API error: ${error.message}`,
          'deepgram',
          'DEEPGRAM_ERROR'
        );
      }
      
      // Rethrow application errors
      if (error instanceof ValidationError || 
          error instanceof DatabaseError || 
          error instanceof ExternalServiceError) {
        throw error;
      }
      
      // Convert any other errors to ExternalServiceError
      throw new ExternalServiceError(
        `Voice processing error: ${error.message}`,
        'voice-processor',
        'VOICE_PROCESSING_ERROR'
      );
    }
  }
  
  /**
   * Transcribe audio using Deepgram
   * @param {Buffer} audioBuffer - Audio file buffer
   * @returns {Promise<Object>} Deepgram transcription response
   */
  async transcribeAudio(audioBuffer) {
    try {
      const transcription = await this.deepgram.transcription.preRecorded(
        { buffer: audioBuffer, mimetype: 'audio/wav' },
        { 
          model: this.model,
          language: this.language,
          punctuate: true,
          diarize: false,
          smart_format: true
        }
      );
      
      return transcription;
    } catch (error) {
      logger.error('Deepgram transcription failed', {
        module: 'voice-processor',
        error: error.message
      });
      
      throw new ExternalServiceError(
        `Deepgram transcription failed: ${error.message}`,
        'deepgram',
        'TRANSCRIPTION_ERROR'
      );
    }
  }
  
  /**
   * Extract inventory items from transcription
   * @param {Object} transcription - Deepgram transcription response
   * @returns {Array<Object>} Extracted inventory items
   */
  extractInventoryItems(transcription) {
    const text = transcription.results?.channels[0]?.alternatives[0]?.transcript || '';
    
    // Extract items using regex patterns (simplified example)
    // This should be expanded with more sophisticated parsing
    const itemPattern = /(\d+)\s+(bottle|case|box|crate|units?|pcs|pieces|pack|carton)s?\s+(?:of\s+)?(.+?)(?:,|\.|$)/gi;
    const matches = [...text.matchAll(itemPattern)];
    
    const items = matches.map(match => {
      return {
        quantity: parseInt(match[1], 10),
        unit: match[2].toLowerCase(),
        productName: match[3].trim(),
        confidence: transcription.results?.channels[0]?.alternatives[0]?.confidence || 0
      };
    });
    
    logger.debug('Extracted inventory items from transcription', {
      module: 'voice-processor',
      itemCount: items.length,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });
    
    return items;
  }
  
  /**
   * Match extracted items with products in database
   * @param {Array<Object>} items - Extracted inventory items
   * @param {string} location - Inventory location
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<Array<Object>>} Matched products with inventory information
   */
  async matchProductsInDatabase(items, location, requestId) {
    try {
      // Get products from database
      const products = await database.getProducts(location);
      
      // Match each item with products
      const matchedProducts = items.map(item => {
        // Find best matching product
        const matchedProduct = this.findBestMatch(item.productName, products);
        
        if (matchedProduct) {
          return {
            productId: matchedProduct.id,
            productName: matchedProduct.name,
            quantity: item.quantity,
            unit: item.unit,
            confidence: this.calculateMatchConfidence(item.productName, matchedProduct.name),
            needsReview: this.calculateMatchConfidence(item.productName, matchedProduct.name) < 0.7,
            originalText: item.productName
          };
        }
        
        return {
          productId: null,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          confidence: 0,
          needsReview: true,
          originalText: item.productName
        };
      });
      
      logger.info('Product matching completed', {
        module: 'voice-processor',
        requestId,
        totalItems: items.length,
        matchedCount: matchedProducts.filter(p => p.productId !== null).length,
        reviewNeeded: matchedProducts.filter(p => p.needsReview).length
      });
      
      return matchedProducts;
    } catch (error) {
      logger.error('Product matching failed', {
        module: 'voice-processor',
        requestId,
        error: error.message
      });
      
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      throw new DatabaseError(
        `Failed to match products: ${error.message}`,
        'matchProducts',
        'PRODUCT_MATCHING_ERROR'
      );
    }
  }
  
  /**
   * Find best matching product from database
   * @param {string} productName - Extracted product name
   * @param {Array<Object>} products - List of products from database
   * @returns {Object|null} Best matching product or null if no good match
   */
  findBestMatch(productName, products) {
    if (!products || products.length === 0) {
      return null;
    }
    
    // Convert to lowercase for matching
    const searchName = productName.toLowerCase();
    
    // Calculate similarity scores
    const scores = products.map(product => {
      const score = this.calculateMatchConfidence(searchName, product.name.toLowerCase());
      return { product, score };
    });
    
    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);
    
    // Return best match if confidence is above threshold
    if (scores[0].score >= 0.5) {
      return scores[0].product;
    }
    
    return null;
  }
  
  /**
   * Calculate match confidence between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Confidence score (0-1)
   */
  calculateMatchConfidence(str1, str2) {
    // Simple Levenshtein distance-based similarity
    // In a real implementation, you might want to use a more sophisticated algorithm
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    
    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    
    // Create distance matrix
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return dp[m][n];
  }
}

// Export singleton instance
module.exports = new VoiceProcessor();