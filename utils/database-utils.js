// utils/database-utils.js

const { GoogleSpreadsheet } = require('google-spreadsheet');
const config = require('../config');
const logger = require('./logger');
const { DatabaseError } = require('./error-handler');
const { retry } = require('./retry');


class DatabaseUtils {
  constructor(configOptions = {}) {
    this.docId = configOptions.docId || process.env.GOOGLE_SHEETS_ID;
    this.clientEmail = configOptions.clientEmail || process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    this.privateKey = configOptions.privateKey || process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    this.inventorySheetName = config.googleSheets.inventorySheetName;
    this.transactionsSheetName = config.googleSheets.transactionsSheetName;
    this.vendorsSheetName = config.googleSheets.vendorsSheetName;
    
    
    
    logger.info('Database utility initialized', { 
      module: 'database-utils',
      docId: this.docId,
      inventorySheet: this.inventorySheetName,
      transactionsSheet: this.transactionsSheetName
    });
  }
  
  /**
   * Get Google Sheets document
   * @returns {Promise<GoogleSpreadsheet>} Google Sheets document
   */
  async initialize() {
    // Validate configuration here
    if (!this.docId || !this.clientEmail || !this.privateKey) {
      throw new Error('Google Sheets configuration is incomplete');
    }
  }

  async getDocument() {
    try {
      const doc = new GoogleSpreadsheet(this.docId);
      await doc.useServiceAccountAuth({
        client_email: this.clientEmail,
        private_key: this.privateKey,
      });
      await doc.loadInfo();
      return doc;
    } catch (error) {
      logger.error('Failed to access Google Sheets document', {
        module: 'database-utils',
        error: error.message,
        stack: error.stack
      });
      throw new DatabaseError(
        `Failed to access Google Sheets document: ${error.message}`,
        'getDocument',
        'SHEETS_ACCESS_ERROR'
      );
    }
  }
  
  /**
   * Get sheet by name with retry logic
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<Object>} Google Sheets worksheet
   */
  async getSheet(sheetName) {
    return retry(async () => {
      const doc = await this.getDocument();
      const sheet = doc.sheetsByTitle[sheetName];
      
      if (!sheet) {
        throw new DatabaseError(
          `Sheet "${sheetName}" not found`,
          'getSheet',
          'SHEET_NOT_FOUND'
        );
      }
      
      return sheet;
    }, {
      maxRetries: config.retries.maxRetries,
      initialDelay: config.retries.initialDelay,
      maxDelay: config.retries.maxDelay,
      onRetry: (error, attempt) => {
        logger.warn(`Retrying getSheet (${attempt}/${config.retries.maxRetries})`, {
          module: 'database-utils',
          sheetName,
          error: error.message
        });
      }
    });
  }
  
  /**
   * Get products from database
   * @param {string} location - Inventory location
   * @returns {Promise<Array<Object>>} List of products
   */
  async getProducts(location = 'main') {
    const timer = logger.startTimer();
    
    try {
      logger.info('Getting products from database', {
        module: 'database-utils',
        location
      });
      
      const sheet = await this.getSheet(this.inventorySheetName);
      await sheet.loadCells();
      
      const rows = await sheet.getRows();
      const products = rows
        .filter(row => !row.location || row.location === location || row.location.toLowerCase() === 'all')
        .map(row => ({
          id: row.id || row.productId,
          name: row.name || row.productName,
          location: row.location || 'main',
          category: row.category || '',
          currentStock: parseInt(row.currentStock || '0', 10),
          unit: row.unit || '',
          price: parseFloat(row.price || '0'),
          reorderPoint: parseInt(row.reorderPoint || '0', 10),
          vendor: row.vendor || '',
          lastUpdated: row.lastUpdated || ''
        }));
      
      const duration = timer.end();
      logger.info(`Retrieved ${products.length} products for location: ${location}`, {
        module: 'database-utils',
        productCount: products.length,
        location,
        duration
      });
      
      return products;
    } catch (error) {
      const duration = timer.end();
      logger.error(`Failed to get products for location: ${location}`, {
        module: 'database-utils',
        location,
        duration,
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(
        `Failed to get products: ${error.message}`,
        'getProducts',
        'PRODUCT_RETRIEVAL_ERROR'
      );
    }
  }
  
  /**
   * Update inventory based on invoice data
   * @param {Array<Object>} items - Invoice items with product information
   * @param {string} invoiceNumber - Invoice number
   * @param {string} invoiceDate - Invoice date
   * @param {string} vendor - Vendor name
   * @returns {Promise<Object>} Update result
   */
  async updateInventoryFromInvoice(items, invoiceNumber, invoiceDate, vendor) {
    const timer = logger.startTimer();
    const timestamp = new Date().toISOString();
    
    try {
      logger.info(`Updating inventory from invoice ${invoiceNumber}`, {
        module: 'database-utils',
        invoiceNumber,
        itemCount: items.length
      });
      
      // 1. Update inventory levels
      const inventorySheet = await this.getSheet(this.inventorySheetName);
      await inventorySheet.loadCells();
      const inventoryRows = await inventorySheet.getRows();
      
      const updates = [];
      for (const item of items) {
        // Find matching product row
        const productRow = inventoryRows.find(row => 
          row.id === item.productId || row.productId === item.productId
        );
        
        if (productRow) {
          const currentStock = parseInt(productRow.currentStock || '0', 10);
          const newStock = currentStock + item.quantity;
          
          productRow.currentStock = newStock.toString();
          productRow.lastUpdated = timestamp;
          
          await productRow.save();
          
          updates.push({
            productId: item.productId,
            productName: item.productName,
            oldStock: currentStock,
            newStock,
            change: item.quantity
          });
        } else {
          logger.warn(`Product not found in inventory: ${item.productName}`, {
            module: 'database-utils',
            productId: item.productId,
            invoiceNumber
          });
        }
      }
      
      // 2. Record transaction
      await this.recordTransaction({
        type: 'invoice',
        source: invoiceNumber,
        date: invoiceDate || timestamp,
        vendor,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0
        })),
        timestamp
      });
      
      const duration = timer.end();
      logger.info(`Inventory updated from invoice ${invoiceNumber}`, {
        module: 'database-utils',
        invoiceNumber,
        updatedItems: updates.length,
        duration
      });
      
      return {
        success: true,
        updatedItems: updates.length,
        updates
      };
    } catch (error) {
      const duration = timer.end();
      logger.error(`Failed to update inventory from invoice ${invoiceNumber}`, {
        module: 'database-utils',
        invoiceNumber,
        duration,
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(
        `Failed to update inventory: ${error.message}`,
        'updateInventoryFromInvoice',
        'INVENTORY_UPDATE_ERROR'
      );
    }
  }
  
  /**
   * Record a transaction in the transactions sheet
   * @param {Object} transaction - Transaction data
   * @returns {Promise<Object>} Result
   */
  async recordTransaction(transaction) {
    try {
      logger.info('Recording transaction', {
        module: 'database-utils',
        transactionType: transaction.type,
        source: transaction.source
      });
      
      const sheet = await this.getSheet(this.transactionsSheetName);
      
      // Add transaction record
      await sheet.addRow({
        id: `TRX-${Date.now()}`,
        type: transaction.type,
        source: transaction.source,
        date: transaction.date,
        vendor: transaction.vendor || '',
        itemCount: transaction.items.length,
        totalQuantity: transaction.items.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: transaction.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
        timestamp: transaction.timestamp || new Date().toISOString(),
        items: JSON.stringify(transaction.items)
      });
      
      logger.info('Transaction recorded successfully', {
        module: 'database-utils',
        transactionType: transaction.type,
        source: transaction.source
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to record transaction', {
        module: 'database-utils',
        transactionType: transaction.type,
        source: transaction.source,
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(
        `Failed to record transaction: ${error.message}`,
        'recordTransaction',
        'TRANSACTION_RECORD_ERROR'
      );
    }
  }
  
  /**
   * Update inventory from voice processing results
   * @param {Array<Object>} items - Voice processed items
   * @param {string} requestId - Request ID for logging
   * @returns {Promise<Object>} Update result
   */
  async updateInventoryFromVoice(items, requestId) {
    const timer = logger.startTimer();
    const timestamp = new Date().toISOString();
    
    try {
      logger.info(`Updating inventory from voice processing (${items.length} items)`, {
        module: 'database-utils',
        requestId,
        itemCount: items.length
      });
      
      // Filter out items that need review
      const validItems = items.filter(item => item.productId && !item.needsReview);
      
      if (validItems.length === 0) {
        logger.info('No valid items to update (all need review)', {
          module: 'database-utils',
          requestId
        });
        
        return {
          success: true,
          updatedItems: 0,
          message: 'No valid items to update (all need review)'
        };
      }
      
      // Update inventory levels
      const inventorySheet = await this.getSheet(this.inventorySheetName);
      await inventorySheet.loadCells();
      const inventoryRows = await inventorySheet.getRows();
      
      const updates = [];
      for (const item of validItems) {
        // Find matching product row
        const productRow = inventoryRows.find(row => 
          row.id === item.productId || row.productId === item.productId
        );
        
        if (productRow) {
          const currentStock = parseInt(productRow.currentStock || '0', 10);
          const newStock = currentStock + item.quantity;
          
          productRow.currentStock = newStock.toString();
          productRow.lastUpdated = timestamp;
          
          await productRow.save();
          
          updates.push({
            productId: item.productId,
            productName: item.productName,
            oldStock: currentStock,
            newStock,
            change: item.quantity
          });
        } else {
          logger.warn(`Product not found in inventory: ${item.productName}`, {
            module: 'database-utils',
            productId: item.productId,
            requestId
          });
        }
      }
      
      // Record voice inventory transaction
      await this.recordTransaction({
        type: 'voice',
        source: `VOICE-${requestId}`,
        date: timestamp,
        vendor: '',
        items: validItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: 0
        })),
        timestamp
      });
      
      const duration = timer.end();
      logger.info('Inventory updated from voice processing', {
        module: 'database-utils',
        requestId,
        updatedItems: updates.length,
        duration
      });
      
      return {
        success: true,
        updatedItems: updates.length,
        updates
      };
    } catch (error) {
      const duration = timer.end();
      logger.error('Failed to update inventory from voice processing', {
        module: 'database-utils',
        requestId,
        duration,
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(
        `Failed to update inventory: ${error.message}`,
        'updateInventoryFromVoice',
        'INVENTORY_UPDATE_ERROR'
      );
    }
  }
  
  /**
   * Get low stock items that need reordering
   * @param {string} location - Inventory location
   * @returns {Promise<Array<Object>>} Low stock items
   */
  async getLowStockItems(location = 'main') {
    try {
      logger.info(`Getting low stock items for location: ${location}`, {
        module: 'database-utils',
        location
      });
      
      const products = await this.getProducts(location);
      
      // Filter items below reorder point
      const lowStockItems = products.filter(product => 
        product.currentStock <= product.reorderPoint
      );
      
      logger.info(`Found ${lowStockItems.length} low stock items`, {
        module: 'database-utils',
        location,
        lowStockCount: lowStockItems.length
      });
      
      return lowStockItems;
    } catch (error) {
      logger.error(`Failed to get low stock items for location: ${location}`, {
        module: 'database-utils',
        location,
        error: error.message,
        stack: error.stack
      });
      
      throw new DatabaseError(
        `Failed to get low stock items: ${error.message}`,
        'getLowStockItems',
        'INVENTORY_QUERY_ERROR'
      );
    }
  }
}
if (process.env.NODE_ENV === 'test') {
  // Export test version
  module.exports = {
    initialize: async () => {},
    getInventoryItems: async () => [],
    updateInventory: async (data) => data,
    createBackup: async () => {}
  };
} else {
  // Export regular version
  const dbUtils = new DatabaseUtils();
  module.exports = dbUtils;
}