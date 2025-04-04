// modules/invoice-processor.js

const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const config = require('../config');
const logger = require('../utils/logger');
const { ValidationError, ExternalServiceError, DatabaseError } = require('../utils/error-handler');
const database = require('../utils/database-utils');
const translationService = require('./translation-service');
const { retry } = require('../utils/retry');

//added for test//

// At the top of your test file after imports

console.log('Module type:', typeof invoiceProcessorModule);
console.log('Is constructor?', typeof invoiceProcessorModule === 'function');
console.log('Keys:', Object.keys(invoiceProcessorModule));

// Try both approaches:
let invoiceProcessor;
if (typeof invoiceProcessorModule === 'function') {
  // It's a class/constructor
  invoiceProcessor = new invoiceProcessorModule();
} else {
  // It's an object with methods
  invoiceProcessor = invoiceProcessorModule;
}

console.log('invoiceProcessor type:', typeof invoiceProcessor);
console.log('invoiceProcessor keys:', Object.keys(invoiceProcessor));

//end of addition


class InvoiceProcessor {
  constructor() {
    this.supportedFormats = config.invoiceProcessing.supportedFormats;
    this.language = 'jpn'; // Japanese OCR
    this.tesseractOptions = config.ocr.tesseractOptions;
    
    logger.info('Invoice processor initialized', {
      module: 'invoice-processor',
      supportedFormats: this.supportedFormats.join(', '),
      language: this.language
    });
  }
  
  /**
   * Process an invoice file
   * @param {string} filePath - Path to invoice file
   * @param {Object} options - Processing options
   * @param {boolean} options.translateToFrench - Whether to translate product names to French
   * @returns {Promise<Object>} Processing results with extracted items
   */
  async processInvoice(filePath, options = {}) {
    const timer = logger.startTimer();
    const requestId = options.requestId || `invoice-${Date.now()}`;
    const translateToFrench = options.translateToFrench !== false; // Default to true
    
    logger.info('Processing invoice', {
      module: 'invoice-processor',
      filePath,
      options,
      requestId
    });
    
    try {
      // 1. Validate file
      this.validateFile(filePath);
      
      // 2. Extract text using OCR
      const extractedText = await this.extractTextFromFile(filePath, requestId);
      
      // 3. Parse invoice data
      const invoiceData = this.parseInvoiceData(extractedText, requestId);
      
      // 4. Translate product names if requested
      if (translateToFrench && invoiceData.items.length > 0) {
        await this.translateProductNames(invoiceData.items, requestId);
      }
      
      // 5. Match with database products
      const matchedProducts = await this.matchProductsInDatabase(
        invoiceData.items,
        options.inventoryLocation || 'main',
        requestId
      );
      
      // 6. Prepare result
      const result = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        vendor: invoiceData.vendor,
        items: matchedProducts,
        total: invoiceData.total,
        processingTime: timer.end()
      };
      
      logger.info('Invoice processing completed successfully', {
        module: 'invoice-processor',
        requestId,
        duration: result.processingTime,
        itemsFound: matchedProducts.length,
        invoiceNumber: invoiceData.invoiceNumber
      });
      
      return result;
    } catch (error) {
      const duration = timer.end();
      logger.error('Invoice processing failed', {
        module: 'invoice-processor',
        requestId,
        duration,
        filePath,
        error: error.message,
        stack: error.stack
      });
      
      // Rethrow application errors
      if (error instanceof ValidationError || 
          error instanceof DatabaseError || 
          error instanceof ExternalServiceError) {
        throw error;
      }
      
      // Convert any other errors to ExternalServiceError
      throw new ExternalServiceError(
        `Invoice processing error: ${error.message}`,
        'invoice-processor',
        'INVOICE_PROCESSING_ERROR'
      );
    }
  }
  
  /**
   * Validate invoice file
   * @param {string} filePath - Path to invoice file
   * @throws {ValidationError} If file is invalid
   */
  validateFile(filePath) {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new ValidationError(`File not found: ${filePath}`, ['filePath'], 'FILE_NOT_FOUND');
    }
    
    // Check file extension
    const extension = path.extname(filePath).toLowerCase().replace('.', '');
    if (!this.supportedFormats.includes(extension)) {
      throw new ValidationError(
        `Unsupported file format: ${extension}. Supported formats: ${this.supportedFormats.join(', ')}`,
        ['filePath'],
        'UNSUPPORTED_FORMAT'
      );
    }
    
    // Check file size
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > config.invoiceProcessing.maxFileSizeMB) {
      throw new ValidationError(
        `File too large: ${fileSizeInMB.toFixed(2)}MB. Maximum size: ${config.invoiceProcessing.maxFileSizeMB}MB`,
        ['filePath'],
        'FILE_TOO_LARGE'
      );
    }
  }
  
  /**
   * Extract text from invoice file
   * @param {string} filePath - Path to invoice file
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromFile(filePath, requestId) {
    logger.info('Extracting text from file', {
      module: 'invoice-processor',
      requestId,
      filePath
    });
    
    const extension = path.extname(filePath).toLowerCase();
    
    try {
      if (extension === '.pdf') {
        return await this.extractTextFromPdf(filePath, requestId);
      } else {
        return await this.extractTextFromImage(filePath, requestId);
      }
    } catch (error) {
      logger.error('Text extraction failed', {
        module: 'invoice-processor',
        requestId,
        filePath,
        error: error.message
      });
      
      throw new ExternalServiceError(
        `Text extraction failed: ${error.message}`,
        'tesseract',
        'TEXT_EXTRACTION_ERROR'
      );
    }
  }
  
  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPdf(filePath, requestId) {
    try {
      // We'll use pdf-parse as mentioned in your requirements
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      
      const result = await pdfParse(dataBuffer);
      
      logger.info('PDF text extraction completed', {
        module: 'invoice-processor',
        requestId,
        pageCount: result.numpages,
        textLength: result.text.length
      });
      
      // If text is extracted but looks like it might be an image-based PDF,
      // we might need OCR anyway
      if (result.text.trim().length < 100) {
        logger.warn('PDF appears to be image-based, falling back to OCR', {
          module: 'invoice-processor',
          requestId,
          textLength: result.text.length
        });
        
        // Since this is an image-based PDF, we would need to convert to image first
        // This would require additional libraries (e.g., pdf2image, pdf.js)
        // For simplicity, we'll throw an error suggesting conversion
        throw new ValidationError(
          'PDF appears to be image-based. Please convert to image format first.',
          ['filePath'],
          'IMAGE_BASED_PDF'
        );
      }
      
      return result.text;
    } catch (error) {
      logger.error('PDF text extraction failed', {
        module: 'invoice-processor',
        requestId,
        error: error.message
      });
      
      throw new ExternalServiceError(
        `PDF text extraction failed: ${error.message}`,
        'pdf-parse',
        'PDF_EXTRACTION_ERROR'
      );
    }
  }
  
  /**
   * Extract text from image file
   * @param {string} filePath - Path to image file
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromImage(filePath, requestId) {
    try {
      // Create and configure Tesseract worker
      const worker = await createWorker({
        ...this.tesseractOptions,
        logger: message => {
          if (message.status === 'recognizing text') {
            logger.debug('OCR progress', {
              module: 'invoice-processor',
              requestId,
              progress: message.progress
            });
          }
        }
      });
      
      // Load Japanese language data
      await worker.loadLanguage('jpn');
      await worker.initialize('jpn');
      
      // Set recognition options
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-,.¥ ():¥円点品個たちにのはをるんでまい',
        preserve_interword_spaces: '1',
      });
      
      // Perform OCR
      const { data } = await worker.recognize(filePath);
      await worker.terminate();
      
      logger.info('Image OCR completed', {
        module: 'invoice-processor',
        requestId,
        confidence: data.confidence,
        textLength: data.text.length
      });
      
      return data.text;
    } catch (error) {
      logger.error('Image OCR failed', {
        module: 'invoice-processor',
        requestId,
        error: error.message
      });
      
      throw new ExternalServiceError(
        `Image OCR failed: ${error.message}`,
        'tesseract',
        'OCR_ERROR'
      );
    }
  }
  
  /**
   * Parse invoice data from extracted text
   * @param {string} text - Extracted text from invoice
   * @param {string} requestId - Request ID for logging
   * @returns {Object} Parsed invoice data
   */
  parseInvoiceData(text, requestId) {
    logger.info('Parsing invoice data', {
      module: 'invoice-processor',
      requestId,
      textLength: text.length
    });
    
    try {
      // For Japanese invoices we would need specialized regex patterns
      // This is a simplified example - would need to be expanded for production
      
      // Extract invoice number (e.g., "請求書番号: INV12345")
      const invoiceNumberMatch = text.match(/請求書番号[:\s]*([A-Z0-9-]+)/i) || 
                               text.match(/インボイス番号[:\s]*([A-Z0-9-]+)/i);
      
      // Extract date (e.g., "日付: 2023年10月15日" or "2023/10/15")
      const dateMatch = text.match(/日付[:\s]*((\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?)/i);
      
      // Extract vendor name
      const vendorMatch = text.match(/発行者[:\s]*(.+)[\r\n]/i) ||
                        text.match(/販売者[:\s]*(.+)[\r\n]/i);
      
      // Extract total amount (e.g., "合計: ¥12,345" or "総額: 12,345円")
      const totalMatch = text.match(/合計[:\s]*[¥￥]?(\d[\d,\.]+)円?/i) ||
                       text.match(/総額[:\s]*[¥￥]?(\d[\d,\.]+)円?/i);
      
      // Extract items - this is the complex part
      // Example format: "商品名 数量 単価 金額"
      const items = this.extractInvoiceItems(text, requestId);
      
      const result = {
        invoiceNumber: invoiceNumberMatch ? invoiceNumberMatch[1] : 'UNKNOWN',
        invoiceDate: dateMatch ? this.parseJapaneseDate(dateMatch[1]) : new Date().toISOString().split('T')[0],
        vendor: vendorMatch ? vendorMatch[1].trim() : 'UNKNOWN',
        total: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0,
        items: items
      };
      
      logger.info('Invoice data parsed successfully', {
        module: 'invoice-processor',
        requestId,
        invoiceNumber: result.invoiceNumber,
        itemCount: items.length
      });
      
      return result;
    } catch (error) {
      logger.error('Invoice parsing failed', {
        module: 'invoice-processor',
        requestId,
        error: error.message
      });
      
      throw new ExternalServiceError(
        `Invoice parsing failed: ${error.message}`,
        'invoice-parser',
        'PARSING_ERROR'
      );
    }
  }
  
  /**
   * Extract invoice items from text
   * @param {string} text - Extracted text from invoice
   * @param {string} requestId - Request ID for logging
   * @returns {Array<Object>} Extracted invoice items
   */
  extractInvoiceItems(text, requestId) {
    try {
      // This is a simplified approach - a real implementation would need
      // more sophisticated parsing based on the specific invoice format
      
      // Look for sections that might contain item listings
      const itemSectionMatch = text.match(/商品明細[\s\S]*?(?=合計|$)/i) || 
                              text.match(/明細[\s\S]*?(?=合計|$)/i);
      
      if (!itemSectionMatch) {
        logger.warn('Could not identify items section in invoice', {
          module: 'invoice-processor',
          requestId
        });
        return [];
      }
      
      const itemSection = itemSectionMatch[0];
      
      // Split by lines and look for patterns like: 
      // 商品名 数量 単価 金額
      // ビール 10 500 5000
      const lines = itemSection.split(/\r?\n/);
      const items = [];
      
      // Try to find item patterns
      // This is a basic pattern - real invoices would need more sophisticated parsing
      const itemPattern = /([^\d]+)\s+(\d+)\s+(\d+)\s+(\d+)/;
      
      for (const line of lines) {
        const match = line.match(itemPattern);
        if (match) {
          items.push({
            productName: match[1].trim(),
            quantity: parseInt(match[2], 10),
            unitPrice: parseInt(match[3], 10),
            amount: parseInt(match[4], 10),
            originalText: line.trim()
          });
        }
      }
      
      // If no items found with the pattern, try a fallback approach
      if (items.length === 0) {
        // Fallback: look for product listings with quantities
        const productPattern = /([^\d]+)\s+(\d+)\s*個/g;
        let productMatch;
        
        while ((productMatch = productPattern.exec(text)) !== null) {
          items.push({
            productName: productMatch[1].trim(),
            quantity: parseInt(productMatch[2], 10),
            unitPrice: 0,  // Unknown
            amount: 0,     // Unknown
            originalText: productMatch[0].trim()
          });
        }
      }
      
      logger.info(`Extracted ${items.length} items from invoice`, {
        module: 'invoice-processor',
        requestId,
        itemCount: items.length
      });
      
      return items;
    } catch (error) {
      logger.error('Failed to extract invoice items', {
        module: 'invoice-processor',
        requestId,
        error: error.message
      });
      
      // Return empty array rather than failing completely
      return [];
    }
  }
  
  /**
   * Parse Japanese date string
   * @param {string} dateStr - Japanese date string (e.g., "2023年10月15日" or "2023/10/15")
   * @returns {string} ISO date string (e.g., "2023-10-15")
   */
  parseJapaneseDate(dateStr) {
    try {
      // Handle format "2023年10月15日"
      const jpFormat = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
      if (jpFormat) {
        const year = parseInt(jpFormat[1], 10);
        const month = parseInt(jpFormat[2], 10).toString().padStart(2, '0');
        const day = parseInt(jpFormat[3], 10).toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Handle format "2023/10/15" or "2023-10-15"
      const standardFormat = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (standardFormat) {
        const year = parseInt(standardFormat[1], 10);
        const month = parseInt(standardFormat[2], 10).toString().padStart(2, '0');
        const day = parseInt(standardFormat[3], 10).toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Default to today if unable to parse
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      logger.warn(`Could not parse date: ${dateStr}`, {
        module: 'invoice-processor',
        error: error.message
      });
      return new Date().toISOString().split('T')[0];
    }
  }
  
  /**
   * Translate product names from Japanese to French
   * @param {Array<Object>} items - Invoice items with Japanese product names
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<void>}
   */
  async translateProductNames(items, requestId) {
    if (!items || items.length === 0) return;
    
    logger.info(`Translating ${items.length} product names from Japanese to French`, {
      module: 'invoice-processor',
      requestId,
      itemCount: items.length
    });
    
    try {
      // Get all product names to translate
      const productNames = items.map(item => item.productName);
      
      // Translate all product names in batch
      const translatedNames = await translationService.translateBatch(
        productNames,
        'ja',  // Japanese
        'fr',  // French
        requestId
      );
      
      
      // Update items with translated names
      if (translatedNames && translatedNames.length === items.length) {
        for (let i = 0; i < items.length; i++) {
          items[i].translatedName = translatedNames[i];
        }
        
        logger.info('Translation completed successfully', {
          module: 'invoice-processor',
          requestId,
          itemCount: items.length
        });
      } else {
        logger.warn('Translation results did not match item count', {
          module: 'invoice-processor',
          requestId,
          itemCount: items.length,
          translatedCount: translatedNames ? translatedNames.length : 0
        });
      }
    } catch (error) {
      logger.error('Translation failed', {
        module: 'invoice-processor',
        requestId,
        error: error.message
      });
      
      // Don't throw - we can still process the invoice with original names
      // Just log the error and continue
    }
  }
  
  /**
   * Match extracted items with products in database
   * @param {Array<Object>} items - Extracted invoice items
   * @param {string} location - Inventory location
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<Array<Object>>} Matched products with inventory information
   */
  async matchProductsInDatabase(items, location, requestId) {
    if (!items || items.length === 0) return [];
    
    try {
      // Get products from database
      const products = await database.getProducts(location);
      
      // Match each item with products
      const matchedProducts = items.map(item => {
        // Search by translated name first if available
        const nameToMatch = item.translatedName || item.productName;
        
        // Find best matching product
        const matchedProduct = this.findBestMatch(nameToMatch, products);
        
        if (matchedProduct) {
          return {
            productId: matchedProduct.id,
            productName: matchedProduct.name,
            originalName: item.productName,
            translatedName: item.translatedName,
            quantity: item.quantity,
            unitPrice: item.unitPrice || matchedProduct.price || 0,
            amount: item.amount || (item.quantity * (item.unitPrice || matchedProduct.price || 0)),
            confidence: this.calculateMatchConfidence(nameToMatch, matchedProduct.name),
            needsReview: this.calculateMatchConfidence(nameToMatch, matchedProduct.name) < 0.7,
            originalText: item.originalText
          };
        }
        
        return {
          productId: null,
          productName: item.productName,
          originalName: item.productName,
          translatedName: item.translatedName,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          amount: item.amount || 0,
          confidence: 0,
          needsReview: true,
          originalText: item.originalText
        };
      });
      
      logger.info('Product matching completed', {
        module: 'invoice-processor',
        requestId,
        totalItems: items.length,
        matchedCount: matchedProducts.filter(p => p.productId !== null).length,
        reviewNeeded: matchedProducts.filter(p => p.needsReview).length
      });
      
      return matchedProducts;
    } catch (error) {
      logger.error('Product matching failed', {
        module: 'invoice-processor',
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
   * @param {string} productName - Product name to match
   * @param {Array<Object>} products - List of products from database
   * @returns {Object|null} Best matching product or null if no good match
   */
  findBestMatch(productName, products) {
    if (!products || products.length === 0 || !productName) {
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
module.exports = new InvoiceProcessor();