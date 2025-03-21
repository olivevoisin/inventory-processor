/**
 * Invoice Service Module
 * Coordinates invoice processing operations
 */
const fs = require('fs').promises;
const path = require('path');
const invoiceProcessor = require('./invoice-processor');
const translationService = require('./translation-service');
const databaseUtils = require('../utils/database-utils');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Process all incoming invoices from a specified directory
 * @param {string} directory - Directory containing invoice files
 * @returns {Promise<Object>} - Processing results
 */
async function processIncomingInvoices(directory = config.uploads.invoiceDir) {
  return invoiceProcessor.processIncomingInvoices(directory);
}

/**
 * Save invoice data to inventory
 * @param {Object} invoiceData - Processed invoice data
 * @returns {Promise<Object>} - Database save result
 */
async function saveInvoiceToInventory(invoiceData) {
  try {
    logger.info(`Saving invoice data to inventory: ${invoiceData.invoiceId}`);
    
    // Convert to inventory format if not already
    const inventoryData = invoiceData.items 
      ? invoiceData 
      : invoiceProcessor.convertToInventoryFormat(invoiceData);
    
    // Save to database
    const result = await databaseUtils.saveInventoryItems(inventoryData.items);
    
    return {
      success: true,
      invoiceId: invoiceData.invoiceId,
      itemsAdded: inventoryData.items.length,
      result
    };
  } catch (error) {
    logger.error(`Error saving invoice to inventory: ${error.message}`);
    throw error;
  }
}

/**
 * Translate invoice items
 * @param {Object} invoiceData - Invoice data with items
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} - Invoice data with translated items
 */
async function translateInvoiceItems(invoiceData, targetLanguage = 'fr') {
  try {
    logger.info(`Translating invoice items to ${targetLanguage}`);
    
    // Extract item descriptions
    const descriptions = invoiceData.items.map(item => item.original_text || item.product_name);
    
    // Translate all descriptions in batch
    const translations = await translationService.batchTranslate(
      descriptions,
      'auto', // Auto-detect source language
      targetLanguage
    );
    
    // Update item descriptions
    const updatedItems = invoiceData.items.map((item, index) => ({
      ...item,
      product_name: translations[index] || item.product_name,
      original_text: item.original_text || item.product_name
    }));
    
    return {
      ...invoiceData,
      items: updatedItems
    };
  } catch (error) {
    logger.error(`Error translating invoice items: ${error.message}`);
    // Return original data on error
    return invoiceData;
  }
}

/**
 * Get invoice history
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Invoice history records
 */
async function getInvoiceHistory(limit = 20) {
  try {
    // In a real implementation, this would query a database
    // For this example, we'll return mock data
    return [
      {
        id: 'INV-001',
        date: '2023-09-15',
        supplier: 'ABC Supplies',
        itemCount: 12,
        status: 'Processed'
      },
      {
        id: 'INV-002',
        date: '2023-09-20',
        supplier: 'XYZ Distributors',
        itemCount: 8,
        status: 'Processed'
      }
    ].slice(0, limit);
  } catch (error) {
    logger.error(`Error getting invoice history: ${error.message}`);
    return [];
  }
}

module.exports = {
  processIncomingInvoices,
  saveInvoiceToInventory,
  translateInvoiceItems,
  getInvoiceHistory
};
