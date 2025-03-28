/**
 * Invoice Service Module
 * Handles invoice processing operations
 */
const fs = require('fs').promises;
const path = require('path');
const invoiceProcessor = require('./invoice-processor');
const translationService = require('./translation-service');
const dbUtils = require('../utils/database-utils');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Process all invoices in a directory
 * @param {string} sourceDir - Directory containing invoices to process
 * @param {string} processedDir - Directory to move processed invoices to
 * @returns {Promise<{success: boolean, processed: number, errors: number}>}
 */
async function processInvoices(sourceDir, processedDir) {
  logger.info(`Processing invoices from ${sourceDir}`);
  
  try {
    // Ensure processed directory exists
    await fs.mkdir(processedDir, { recursive: true });
    
    // Get all PDF files in the source directory
    const files = await fs.readdir(sourceDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      logger.info('No PDF files found to process');
      return {
        success: true,
        processed: 0,
        errors: 0
      };
    }
    
    let processed = 0;
    let errors = 0;
    
    // Process each invoice file
    for (const file of pdfFiles) {
      const filePath = path.join(sourceDir, file);
      const processedPath = path.join(processedDir, file);
      
      try {
        // Process the invoice
        logger.info(`Processing invoice: ${file}`);
        const result = await invoiceProcessor.processInvoice(filePath, 'Bar');
        
        // Save invoice data to database
        await dbUtils.saveInvoice({
          fileName: file,
          date: result.invoiceDate,
          total: result.total,
          items: result.items
        });
        
        // Save inventory items
        await dbUtils.saveInventoryItems({
          date: result.invoiceDate,
          location: result.location || 'Bar',
          items: result.items.map(item => ({
            product: item.product,
            count: item.count
          }))
        });
        
        // Move file to processed directory
        await fs.rename(filePath, processedPath);
        
        processed++;
      } catch (error) {
        logger.error(`Error processing invoice ${file}: ${error.message}`);
        errors++;
      }
    }
    
    logger.info(`Completed processing ${processed} invoices with ${errors} errors`);
    
    return {
      success: true,
      processed,
      errors
    };
  } catch (error) {
    logger.error(`Invoice processing failed: ${error.message}`);
    return {
      success: false,
      processed: 0,
      errors: 1,
      message: error.message
    };
  }
}

/**
 * Process a single invoice file
 * @param {string} filePath - Path to the invoice file
 * @param {string} location - Location (Bar, Kitchen, etc.)
 * @returns {Promise<Object>} - Processed invoice data
 */
async function processSingleInvoice(filePath, location) {
  try {
    // Process the invoice
    const invoiceData = await invoiceProcessor.processInvoice(filePath, location);
    
    // Check if products exist in database and add if needed
    for (const item of invoiceData.items) {
      const existingProduct = await dbUtils.findProductByName(item.product);
      
      if (!existingProduct) {
        logger.info(`Adding new product to database: ${item.product}`);
        
        // Estimate price based on invoice (or use default)
        const price = item.price 
          ? (parseFloat(item.price.replace(/,/g, '')) / item.count).toFixed(2)
          : '39.99'; // Default price if not available
        
        await dbUtils.addProduct({
          name: item.product,
          unit: 'bottle', // Default unit
          price: price,
          location: location
        });
      }
    }
    
    // Return the processed invoice data
    return invoiceData;
  } catch (error) {
    logger.error(`Error processing invoice ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Start the invoice processing scheduler
 */
function startScheduler() {
  // This would set up a scheduler to periodically process invoices
  logger.info('Invoice scheduler started');
}

/**
 * Stop the invoice processing scheduler
 */
function stopScheduler() {
  // This would stop the scheduler
  logger.info('Invoice scheduler stopped');
}

module.exports = {
  processInvoices,
  processSingleInvoice,
  startScheduler,
  stopScheduler
};
