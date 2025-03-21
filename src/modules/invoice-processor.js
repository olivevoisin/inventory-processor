/**
 * Invoice Processor Module
 * Handles processing of invoices for inventory management
 */
const fs = require('fs').promises;
const path = require('path');
const { createWorker } = require('tesseract.js');
const pdfParse = require('pdf-parse');
const translationService = require('./translation-service');
const logger = require('../utils/logger');
const databaseUtils = require('../utils/database-utils');
const config = require('../config');

/**
 * Process an invoice file (PDF or image)
 * @param {string} filePath - Path to the invoice file
 * @param {string} language - Source language code (default: 'ja')
 * @returns {Promise<Object>} - Processing results
 */
async function processInvoice(filePath, language = 'ja') {
  try {
    logger.info(`Processing invoice: ${filePath}`);
    
    // Read file
    const fileData = await fs.readFile(filePath);
    
    // Determine file type by extension
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Extract text from file
    let extractedText;
    if (fileExt === '.pdf') {
      extractedText = await extractTextFromPdf(fileData);
    } else {
      extractedText = await extractTextFromImage(fileData, language);
    }
    
    // Extract invoice data
    const invoiceData = await extractInvoiceData(extractedText, language);
    
    // Convert to inventory format
    const inventoryItems = convertToInventoryFormat(invoiceData);
    
    return {
      invoiceId: invoiceData.invoiceId || `INV-${Date.now()}`,
      supplier: invoiceData.supplier,
      date: invoiceData.date,
      total: invoiceData.total,
      items: inventoryItems.items,
      raw: extractedText
    };
  } catch (error) {
    logger.error(`Error processing invoice: ${error.message}`);
    throw error;
  }
}

/**
 * Extract text from PDF file
 * @param {Buffer} pdfData - PDF file data
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromPdf(pdfData) {
  try {
    const result = await pdfParse(pdfData);
    return result.text;
  } catch (error) {
    logger.error(`Error extracting text from PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Extract text from image file using OCR
 * @param {Buffer} imageData - Image file data
 * @param {string} language - Language code for OCR
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(imageData, language) {
  const worker = await createWorker(language);
  
  try {
    const result = await worker.recognize(imageData);
    await worker.terminate();
    return result.data.text;
  } catch (error) {
    if (worker) {
      await worker.terminate();
    }
    logger.error(`Error extracting text from image: ${error.message}`);
    throw error;
  }
}

/**
 * Extract structured data from invoice text
 * @param {string} text - Extracted text from invoice
 * @param {string} language - Source language
 * @returns {Promise<Object>} - Structured invoice data
 */
async function extractInvoiceData(text, language) {
  try {
    // Basic extraction of common invoice fields
    // In a real implementation, this would be more sophisticated
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Extract invoice number (simple pattern matching)
    const invoiceIdMatch = text.match(/invoice\s*[#:]?\s*([A-Z0-9-]+)/i) || 
                           text.match(/請求書\s*[#:]?\s*([A-Z0-9-]+)/);
    
    // Extract date (simple pattern matching)
    const dateMatch = text.match(/date\s*[:]?\s*(\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4})/i) ||
                     text.match(/(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);
    
    // Extract supplier (usually at the top of invoice)
    const supplierLine = lines.length > 0 ? lines[0] : '';
    
    // Initialize result object
    const invoiceData = {
      invoiceId: invoiceIdMatch ? invoiceIdMatch[1] : `INV-${Date.now()}`,
      date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
      supplier: supplierLine,
      items: [],
      total: 0
    };
    
    // Pattern for item lines (quantity, description, price)
    // This is a simplified example - real invoices would need more robust patterns
    const itemRegex = language === 'ja' 
      ? /(\d+)\s*個?\s*([^\d]+)\s*(\d+(?:,\d+)*(?:\.\d+)?)/
      : /(\d+)\s*(?:x|pcs|units)?\s*([^\d]+)\s*(\d+(?:,\d+)*(?:\.\d+)?)/;
    
    // Extract items
    for (const line of lines) {
      const match = line.match(itemRegex);
      if (match) {
        const [_, quantity, description, price] = match;
        
        // Clean up and normalize
        const cleanDesc = description.trim();
        const cleanPrice = parseFloat(price.replace(/,/g, ''));
        
        invoiceData.items.push({
          quantity: parseInt(quantity, 10),
          description: cleanDesc,
          price: cleanPrice,
          total: parseInt(quantity, 10) * cleanPrice
        });
        
        invoiceData.total += parseInt(quantity, 10) * cleanPrice;
      }
    }
    
    // If language is not English, translate the descriptions
    if (language !== 'en' && invoiceData.items.length > 0) {
      const descriptions = invoiceData.items.map(item => item.description);
      const translations = await translationService.batchTranslate(descriptions, language, 'fr');
      
      // Update with translations
      for (let i = 0; i < invoiceData.items.length; i++) {
        invoiceData.items[i].translated = translations[i] || invoiceData.items[i].description;
      }
    }
    
    return invoiceData;
  } catch (error) {
    logger.error(`Error extracting invoice data: ${error.message}`);
    throw error;
  }
}

/**
 * Convert invoice data to inventory update format
 * @param {Object} invoiceData - Structured invoice data
 * @returns {Object} - Data in inventory format
 */
function convertToInventoryFormat(invoiceData) {
  const inventoryItems = {
    source: 'invoice',
    invoiceId: invoiceData.invoiceId,
    date: invoiceData.date,
    supplier: invoiceData.supplier,
    items: []
  };
  
  // Convert each invoice item to inventory format
  invoiceData.items.forEach(item => {
    inventoryItems.items.push({
      product_name: item.translated || item.description,
      original_text: item.description,
      quantity: item.quantity,
      price: item.price,
      unit: determineUnit(item.description),
      source: 'invoice'
    });
  });
  
  return inventoryItems;
}

/**
 * Determine the appropriate unit based on item description
 * @param {string} description - Item description
 * @returns {string} - Determined unit
 */
function determineUnit(description) {
  // Simple unit determination based on common keywords
  const desc = description.toLowerCase();
  
  if (desc.includes('bottle') || desc.includes('ボトル')) return 'bottle';
  if (desc.includes('can') || desc.includes('缶')) return 'can';
  if (desc.includes('kg') || desc.includes('kilo')) return 'kg';
  if (desc.includes('g') || desc.includes('gram')) return 'g';
  if (desc.includes('l') || desc.includes('liter')) return 'l';
  if (desc.includes('ml')) return 'ml';
  if (desc.includes('box') || desc.includes('箱')) return 'box';
  
  // Default to piece
  return 'piece';
}

/**
 * Process all incoming invoices in a directory
 * @param {string} directory - Directory containing invoice files
 * @returns {Promise<Object>} - Processing results
 */
async function processIncomingInvoices(directory = config.uploads.invoiceDir) {
  try {
    logger.info(`Processing invoices in directory: ${directory}`);
    
    // Check if directory exists
    try {
      await fs.access(directory);
    } catch (error) {
      // Create directory if it doesn't exist
      await fs.mkdir(directory, { recursive: true });
      return { processed: 0, errors: 0, message: 'Directory created, no files to process' };
    }
    
    // Read directory
    const files = await fs.readdir(directory);
    
    // Filter for invoice files (PDF and images)
    const invoiceFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext);
    });
    
    if (invoiceFiles.length === 0) {
      return { processed: 0, errors: 0, message: 'No invoice files found' };
    }
    
    // Process each file
    const results = {
      processed: 0,
      errors: 0,
      items: []
    };
    
    for (const file of invoiceFiles) {
      try {
        const filePath = path.join(directory, file);
        const result = await processInvoice(filePath);
        
        // Add to inventory if items were found
        if (result.items && result.items.length > 0) {
          await databaseUtils.saveInventoryItems(result.items);
        }
        
        // Move file to processed directory
        const processedDir = path.join(directory, 'processed');
        await fs.mkdir(processedDir, { recursive: true });
        await fs.rename(filePath, path.join(processedDir, file));
        
        results.processed++;
        results.items.push(...(result.items || []));
      } catch (error) {
        logger.error(`Error processing invoice file ${file}: ${error.message}`);
        results.errors++;
      }
    }
    
    return results;
  } catch (error) {
    logger.error(`Error in batch invoice processing: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processInvoice,
  extractInvoiceData,
  convertToInventoryFormat,
  processIncomingInvoices
};
