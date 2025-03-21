/**
 * Google Sheets Module
 * Handles inventory operations using Google Sheets
 */
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { ExternalServiceError } = require('../utils/error-handler');
const logger = require('../utils/logger');
const config = require('../config');

// Cached document
let doc = null;

/**
 * Initialize Google Sheets document 
 * @returns {Promise<GoogleSpreadsheet>} Google Sheets document
 */
async function initDocument() {
  if (doc) return doc;

  try {
    const docId = config.googleSheets?.docId;
    if (!docId) {
      throw new Error('Google Sheets document ID not configured');
    }

    // Create a new document instance
    doc = new GoogleSpreadsheet(docId);

    // Auth
    await doc.useServiceAccountAuth({
      client_email: config.googleSheets.clientEmail,
      private_key: config.googleSheets.privateKey.replace(/\\n/g, '\n'),
    });

    // Load document info
    await doc.loadInfo();
    
    logger.info(`Google Sheets document initialized: ${doc.title}`);
    
    return doc;
  } catch (error) {
    logger.error(`Error initializing Google Sheets: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Get inventory data from Google Sheets
 * @returns {Promise<Array>} Inventory items
 */
async function getInventory() {
  try {
    const document = await initDocument();
    const sheet = document.sheetsByTitle['Inventory'];
    
    if (!sheet) {
      throw new Error('Inventory sheet not found');
    }

    const rows = await sheet.getRows();
    
    return rows.map(row => ({
      sku: row.sku,
      quantity: parseInt(row.quantity, 10),
      location: row.location,
      lastUpdated: row.lastUpdated,
      price: parseFloat(row.price)
    }));
  } catch (error) {
    logger.error(`Error getting inventory: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Update an inventory item
 * @param {Object} item - Item to update 
 * @returns {Promise<boolean>} Success indicator
 */
async function updateInventory(item) {
  try {
    const document = await initDocument();
    const sheet = document.sheetsByTitle['Inventory'];
    
    if (!sheet) {
      throw new Error('Inventory sheet not found');
    }

    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(row => row.sku === item.sku);
    
    if (!rowToUpdate) {
      throw new Error(`Item with SKU ${item.sku} not found`);
    }

    // Update row values
    rowToUpdate.quantity = item.quantity.toString();
    rowToUpdate.location = item.location;
    rowToUpdate.lastUpdated = item.lastUpdated || new Date().toISOString().split('T')[0];
    rowToUpdate.price = item.price.toString();
    
    // Save changes
    await rowToUpdate.save();
    
    logger.info(`Updated inventory item: ${item.sku}`);
    return true;
  } catch (error) {
    logger.error(`Error updating inventory: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Add a new inventory item
 * @param {Object} item - Item to add
 * @returns {Promise<boolean>} Success indicator
 */
async function addInventoryItem(item) {
  try {
    const document = await initDocument();
    const sheet = document.sheetsByTitle['Inventory'];
    
    if (!sheet) {
      throw new Error('Inventory sheet not found');
    }

    // Add new row
    await sheet.addRow({
      sku: item.sku,
      quantity: item.quantity.toString(),
      location: item.location,
      lastUpdated: item.lastUpdated || new Date().toISOString().split('T')[0],
      price: item.price.toString()
    });
    
    logger.info(`Added inventory item: ${item.sku}`);
    return true;
  } catch (error) {
    logger.error(`Error adding inventory item: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Delete an inventory item
 * @param {string} sku - Item SKU to delete
 * @returns {Promise<boolean>} Success indicator
 */
async function deleteInventoryItem(sku) {
  try {
    const document = await initDocument();
    const sheet = document.sheetsByTitle['Inventory'];
    
    if (!sheet) {
      throw new Error('Inventory sheet not found');
    }

    const rows = await sheet.getRows();
    const rowToDelete = rows.find(row => row.sku === sku);
    
    if (!rowToDelete) {
      throw new Error(`Item with SKU ${sku} not found`);
    }

    // Delete row
    await rowToDelete.delete();
    
    logger.info(`Deleted inventory item: ${sku}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting inventory item: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Export inventory to Google Sheets
 * @param {Array} items - Inventory items to export
 * @returns {Promise<Object>} Export result with document URL
 */
async function exportInventory(items) {
  try {
    const document = await initDocument();
    const sheet = document.sheetsByTitle['Inventory'] || 
                  await document.addSheet({ title: 'Inventory' });
    
    // Clear existing data (except header)
    const rows = await sheet.getRows();
    for (const row of rows) {
      await row.delete();
    }
    
    // Add items as rows
    for (const item of items) {
      await sheet.addRow({
        sku: item.sku || item.id,
        quantity: item.quantity.toString(),
        location: item.location || '',
        lastUpdated: item.lastUpdated || new Date().toISOString().split('T')[0],
        price: (item.price || 0).toString()
      });
    }
    
    logger.info(`Exported ${items.length} items to Google Sheets`);
    return {
      success: true,
      url: `https://docs.google.com/spreadsheets/d/${document._id}`,
      itemCount: items.length
    };
  } catch (error) {
    logger.error(`Error exporting inventory: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

module.exports = {
  getInventory,
  updateInventory,
  addInventoryItem,
  deleteInventoryItem,
  exportInventory
};
