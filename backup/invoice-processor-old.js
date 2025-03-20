const { createWorker } = require('tesseract.js');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const translationService = require('./translation-service');
const dbUtils = require('../utils/database-utils');
const config = require('../config');

/**
 * Invoice Processor Module
 * Handles OCR operations for Japanese invoices, text extraction, and processing
 */
class InvoiceProcessor {
  constructor() {
    this.worker = null;
    this.initialized = false;
    this.tempDir = path.join(__dirname, '../temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Initialize Tesseract worker with Japanese language support
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing Tesseract worker for Japanese OCR');
      this.worker = await createWorker('jpn');
      this.initialized = true;
      logger.info('Tesseract worker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Tesseract worker', { error: error.message });
      throw new Error('OCR initialization failed: ' + error.message);
    }
  }

  /**
   * Process a PDF invoice
   * @param {Buffer} fileBuffer - The PDF file buffer
   * @returns {Promise<Object>} - Extracted and processed invoice data
   */
  async processPdfInvoice(fileBuffer) {
    await this.initialize();
    
    try {
      logger.info('Processing PDF invoice');
      
      // Parse PDF to extract text and images
      const pdfData = await pdfParse(fileBuffer);
      
      // Extract text content from PDF
      const extractedText = pdfData.text;
      
      // Process the extracted text
      return await this.processExtractedText(extractedText);
      
    } catch (error) {
      logger.error('Error processing PDF invoice', { error: error.message });
      throw new Error('PDF processing failed: ' + error.message);
    }
  }

  /**
   * Process an image invoice (JPG, PNG, etc.)
   * @param {Buffer} fileBuffer - The image file buffer
   * @returns {Promise<Object>} - Extracted and processed invoice data
   */
  async processImageInvoice(fileBuffer) {
    await this.initialize();
    
    try {
      logger.info('Processing image invoice');
      
      // Preprocess image to improve OCR quality
      const preprocessedImageBuffer = await this.preprocessImage(fileBuffer);
      
      // Perform OCR on the image
      const { data } = await this.worker.recognize(preprocessedImageBuffer);
      
      // Process the extracted text
      return await this.processExtractedText(data.text);
      
    } catch (error) {
      logger.error('Error processing image invoice', { error: error.message });
      throw new Error('Image processing failed: ' + error.message);
    }
  }

  /**
   * Preprocess image to improve OCR quality
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Buffer>} - Preprocessed image buffer
   */
  async preprocessImage(imageBuffer) {
    try {
      // Apply preprocessing to improve OCR accuracy
      return await sharp(imageBuffer)
        .greyscale() // Convert to grayscale
        .normalize() // Normalize the image
        .sharpen() // Enhance details
        .toBuffer();
    } catch (error) {
      logger.error('Image preprocessing failed', { error: error.message });
      throw new Error('Image preprocessing failed: ' + error.message);
    }
  }

  /**
   * Extract structured data from invoice text
   * @param {string} text - The extracted text from the invoice
   * @returns {Promise<Object>} - Structured invoice data
   */
  async processExtractedText(text) {
    try {
      logger.info('Processing extracted text from invoice');
      
      // Extract invoice details using regex patterns for Japanese invoice formats
      const invoiceData = {
        products: [],
        invoiceNumber: this.extractInvoiceNumber(text),
        invoiceDate: this.extractInvoiceDate(text),
        totalAmount: this.extractTotalAmount(text)
      };
      
      // Extract product entries (name, quantity, unit, price)
      const productEntries = this.extractProductEntries(text);
      
      // Translate product information to French
      for (const product of productEntries) {
        const translatedProduct = await this.translateProductInfo(product);
        invoiceData.products.push(translatedProduct);
      }
      
      logger.info('Successfully processed invoice text', { 
        productsCount: invoiceData.products.length,
        invoiceNumber: invoiceData.invoiceNumber
      });
      
      // Save to database
      await this.saveToDatabase(invoiceData);
      
      return invoiceData;
      
    } catch (error) {
      logger.error('Error processing extracted text', { error: error.message });
      throw new Error('Text processing failed: ' + error.message);
    }
  }

  /**
   * Extract invoice number using regex pattern
   * @param {string} text - Full invoice text
   * @returns {string} - Extracted invoice number
   */
  extractInvoiceNumber(text) {
    // Common patterns for invoice numbers in Japanese invoices
    const patterns = [
      /請求書番号[:\s]*([\d\-]+)/i,
      /インボイス番号[:\s]*([\d\-]+)/i,
      /納品書番号[:\s]*([\d\-]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Extract invoice date using regex pattern
   * @param {string} text - Full invoice text
   * @returns {string} - Extracted date
   */
  extractInvoiceDate(text) {
    // Patterns for dates in Japanese formats (年月日)
    const patterns = [
      /請求日[:\s]*(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?)/i,
      /発行日[:\s]*(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?)/i,
      /日付[:\s]*(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Extract total amount from invoice text
   * @param {string} text - Full invoice text
   * @returns {string} - Extracted total amount
   */
  extractTotalAmount(text) {
    // Patterns for total amount in Japanese invoices (with yen symbol ¥)
    const patterns = [
      /合計金額[:\s]*([¥￥]?[\d,]+)/i,
      /請求金額[:\s]*([¥￥]?[\d,]+)/i,
      /総額[:\s]*([¥￥]?[\d,]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Extract product entries from invoice text
   * @param {string} text - Full invoice text
   * @returns {Array<Object>} - Array of product objects
   */
  extractProductEntries(text) {
    const products = [];
    
    // Split text into lines for processing
    const lines = text.split('\n');
    
    // Look for product table section
    let inProductSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if we're entering a product section
      if (line.includes('商品名') || line.includes('品名') || line.includes('項目')) {
        inProductSection = true;
        continue;
      }
      
      // Check if we're exiting the product section
      if (inProductSection && (line.includes('合計') || line.includes('小計'))) {
        inProductSection = false;
        continue;
      }
      
      if (inProductSection) {
        // Look for patterns that indicate product information
        // Usually in format: Product name, quantity, unit, price
        const productPatterns = [
          // Pattern for lines with tab or multiple space separators
          /^(.+?)[　\t]+(\d+)[　\t]+([個箱本枚パック]+)[　\t]+([¥￥]?[\d,]+)/,
          // Pattern for CSV-like format
          /^(.+?)[,、][\s]*(\d+)[,、][\s]*([個箱本枚パック]+)[,、][\s]*([¥￥]?[\d,]+)/
        ];
        
        for (const pattern of productPatterns) {
          const match = line.match(pattern);
          if (match) {
            products.push({
              name: match[1].trim(),
              quantity: match[2].trim(),
              unit: match[3].trim(),
              price: match[4].trim().replace(/[¥￥,]/g, '')
            });
            break;
          }
        }
        
        // If no match with standard patterns, try to identify product by position in line
        if (products.length === 0 && line.length > 10) {
          // Simple heuristic: if line contains numbers and is long enough, it might be a product
          const numberMatches = line.match(/\d+/g);
          if (numberMatches && numberMatches.length >= 2) {
            // Split the line by whitespace and try to extract product info
            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
              // Assume format: name, quantity, price
              const nameEndIndex = line.indexOf(parts[parts.length - 2]);
              products.push({
                name: line.substring(0, nameEndIndex).trim(),
                quantity: parts[parts.length - 2],
                unit: '個', // Default unit
                price: parts[parts.length - 1].replace(/[¥￥,]/g, '')
              });
            }
          }
        }
      }
    }
    
    return products;
  }

  /**
   * Translate product information from Japanese to French
   * @param {Object} product - Product information in Japanese
   * @returns {Promise<Object>} - Product information in French
   */
  async translateProductInfo(product) {
    try {
      logger.info('Translating product information to French', { productName: product.name });
      
      // Translate product name from Japanese to French
      const translatedName = await translationService.translateText(product.name, 'ja', 'fr');
      
      // Translate unit if needed
      const translatedUnit = await translationService.translateText(product.unit, 'ja', 'fr');
      
      return {
        ...product,
        name_ja: product.name, // Keep original name
        name: translatedName, // Translated name
        unit_ja: product.unit, // Keep original unit
        unit: translatedUnit // Translated unit
      };
      
    } catch (error) {
      logger.error('Translation failed for product', { 
        productName: product.name,
        error: error.message 
      });
      
      // Return original product with error flag if translation fails
      return {
        ...product,
        name_ja: product.name,
        name: `[TRANSLATION FAILED] ${product.name}`,
        unit_ja: product.unit,
        unit: product.unit,
        translationError: true
      };
    }
  }

  /**
   * Save processed invoice data to Google Sheets database
   * @param {Object} invoiceData - Processed invoice data
   * @returns {Promise<void>}
   */
  async saveToDatabase(invoiceData) {
    try {
      logger.info('Saving invoice data to database', { invoiceNumber: invoiceData.invoiceNumber });
      
      // For each product, add or update the entry in the database
      for (const product of invoiceData.products) {
        await dbUtils.addOrUpdateProduct({
          name: product.name,
          name_ja: product.name_ja,
          quantity: parseInt(product.quantity, 10),
          unit: product.unit,
          price: parseFloat(product.price),
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: invoiceData.invoiceDate,
          lastUpdated: new Date().toISOString()
        });
      }
      
      logger.info('Successfully saved invoice data to database', { 
        invoiceNumber: invoiceData.invoiceNumber,
        productsCount: invoiceData.products.length
      });
      
    } catch (error) {
      logger.error('Failed to save invoice data to database', { 
        error: error.message,
        invoiceNumber: invoiceData.invoiceNumber
      });
      throw new Error('Database operation failed: ' + error.message);
    }
  }

  /**
   * Clean up resources
   */
  async terminate() {
    if (this.worker && this.initialized) {
      await this.worker.terminate();
      this.initialized = false;
      logger.info('Tesseract worker terminated');
    }
  }
}

module.exports = new InvoiceProcessor();