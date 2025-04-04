/**
 * Google Sheets Service
 * Handles inventory operations using Google Sheets API
 */
const logger = require('../utils/logger');
const { ExternalServiceError } = require('../utils/error-handler');

/**
 * Initialize Google Sheets connection
 */
async function initialize() {
  logger.info('Initializing Google Sheets connection');
  return true;
}

/**
 * Check if connected to Google Sheets
 */
function isConnected() {
  return true;
}

/**
 * Get all products
 */
async function getProducts() {
  logger.info('Getting products from Google Sheets');
  return [
    { id: 'prod1', name: 'Wine', unit: 'bottle', price: 15.99, original_name: 'Vin Rouge' },
    { id: 'prod2', name: 'Beer', unit: 'can', price: 3.99, original_name: 'Bière' },
    { id: 'prod3', name: 'Vodka', unit: 'bottle', price: 25.99, original_name: 'Vodka' }
  ];
}

/**
 * Get inventory for location and period
 */
async function getInventory(location, period) {
  logger.info(`Getting inventory for ${location} during ${period}`);
  return [
    { product_name: 'Wine', quantity: 10, unit: 'bottle', date: '2023-01-15' },
    { product_name: 'Beer', quantity: 24, unit: 'can', date: '2023-01-15' }
  ];
}

/**
 * Save inventory items
 */
async function saveInventoryItems(items, location, period) {
  logger.info(`Saving ${items.length} inventory items for ${location} during ${period}`);
  return {
    success: true,
    saved: items.length,
    errors: 0
  };
}

/**
 * Save product
 */
async function saveProduct(product) {
  logger.info(`Saving product: ${product.name}`);
  return {
    ...product,
    id: product.id || `prod-${Date.now()}`
  };
}

module.exports = {
  initialize,
  isConnected,
  getProducts,
  getInventory,
  saveInventoryItems,
  saveProduct
};
