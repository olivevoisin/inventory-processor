/**
 * Invoice Service Module
 * Handles invoice management operations
 */
const fs = require('fs').promises;
const path = require('path');
const invoiceProcessor = require('./invoice-processor');
const translationService = require('./translation-service');
const logger = require('../utils/logger');
const { ExternalServiceError } = require('../utils/error-handler');
const config = require('../config');

/**
 * Process all incoming invoices in a directory
 * @param {string} directory - Directory containing invoice files
 * @returns {Promise<Object>} - Processing results
 */
async function processIncomingInvoices(directory = './uploads/invoices') {
  try {
    return await invoiceProcessor.processIncomingInvoices(directory);
  } catch (error) {
    logger.error(`Error in invoice service processing: ${error.message}`);
    return {
      processed: 0,
      errors: 1,
      message: error.message
    };
  }
}

/**
 * Get invoice by ID
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} - Invoice data
 */
async function getInvoice(invoiceId) {
  try {
    // In a real implementation, this would query a database
    // For testing, we'll return a dummy invoice
    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }
    
    return {
      id: invoiceId,
      date: '2023-10-01',
      supplier: 'Test Supplier',
      items: [
        { product_name: 'Wine', quantity: 10, unit: 'bottle', price: 15 },
        { product_name: 'Beer', quantity: 24, unit: 'can', price: 5 }
      ],
      total: 270
    };
  } catch (error) {
    logger.error(`Error getting invoice: ${error.message}`);
    throw error;
  }
}

/**
 * Save invoice to the system
 * @param {Object} invoice - Invoice data
 * @returns {Promise<Object>} - Saved invoice
 */
async function saveInvoice(invoice) {
  try {
    if (!invoice) {
      throw new Error('Invoice data is required');
    }
    
    // In a real implementation, this would save to a database
    logger.info(`Saved invoice: ${invoice.id || 'new'}`);
    
    return {
      ...invoice,
      id: invoice.id || `INV-${Date.now()}`,
      saved: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error saving invoice: ${error.message}`);
    throw error;
  }
}

/**
 * Translate invoice items
 * @param {Object} invoice - Invoice with items to translate
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} - Invoice with translated items
 */
async function translateInvoice(invoice, targetLanguage = 'fr') {
  try {
    if (!invoice || !invoice.items) {
      throw new Error('Valid invoice with items is required');
    }
    
    // Extract item texts to translate
    const texts = invoice.items.map(item => item.product_name);
    
    // Translate in batch
    const translations = await translationService.batchTranslate(
      texts, 
      'auto',
      targetLanguage
    );
    
    // Update items with translations
    const translatedItems = invoice.items.map((item, index) => ({
      ...item,
      original_name: item.product_name,
      product_name: translations[index]
    }));
    
    return {
      ...invoice,
      items: translatedItems,
      translated: true
    };
  } catch (error) {
    logger.error(`Error translating invoice: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processIncomingInvoices,
  getInvoice,
  saveInvoice,
  translateInvoice
};
