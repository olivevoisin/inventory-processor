/**
 * Database utilities module for inventory management system with dependency injection
 */

// Default imports that can be overridden in tests
let dependencies = {
  logger: require('./logger'),
  googleSheetsService: require('../modules/google-sheets-service')
};

// Mock database for testing without external dependencies
let mockDb = {
  products: [],
  inventory: [],
  invoices: []
};

/**
 * Override dependencies for testing
 * @param {Object} deps - Object containing dependencies to override
 */
const __setDependencies = (deps = {}) => {
  dependencies = { ...dependencies, ...deps };
};

/**
 * Initialize the database connection
 * @param {Object} options - Connection options
 * @returns {Promise<boolean>} - Success or failure
 */
const initialize = async (options = {}) => {
  dependencies.logger.info('Initializing database connection');
  
  try {
    await dependencies.googleSheetsService.initialize(options);
    return true;
  } catch (error) {
    dependencies.logger.error(`Error initializing database: ${error.message}`);
    return false;
  }
};

/**
 * Find a product by name
 * @param {string} name - Product name to search for
 * @returns {Promise<Object|null>} - Found product or null
 */
const findProductByName = async (name) => {
  dependencies.logger.info(`Finding product by name: ${name}`);
  if (!name) return null;
  
  try {
    const nameStr = String(name).toLowerCase();
    const product = mockDb.products.find(p => 
      p.name && p.name.toLowerCase() === nameStr || 
      (p.name && p.name.toLowerCase().includes(nameStr))
    );
    return product || null;
  } catch (error) {
    dependencies.logger.error(`Error finding product by name: ${error.message}`);
    return null;
  }
};

/**
 * Save inventory items
 * @param {Array|Object} items - Items to save or object with items property
 * @param {string} sheetName - Optional sheet name
 * @param {string} period - Optional period in YYYY-MM format
 * @returns {Promise<Object>} - Result with success status
 */
const saveInventoryItems = async (items, sheetName, period) => {
  try {
    // Handle both array and object with items property
    const itemsArray = Array.isArray(items) ? items : (items.items || []);
    const location = !Array.isArray(items) ? items.location : undefined;
    
    // Handle location determination if not explicitly provided
    let effectiveLocation = location;
    
    if (!effectiveLocation && itemsArray.length > 0 && itemsArray[0].location) {
      effectiveLocation = itemsArray[0].location;
    }
    
    dependencies.logger.info(`Saving ${itemsArray.length} inventory items${sheetName ? ` to sheet: ${sheetName}` : ''}`);
    
    // Validate location is available
    if (!effectiveLocation) {
      return {
        success: false,
        message: 'Emplacement non spécifié'
      };
    }
    
    // Validate period format if provided
    let effectivePeriod = period;
    if (period && !/^\d{4}-\d{2}$/.test(period)) {
      return {
        success: false,
        error: 'Invalid period format. Required format: YYYY-MM'
      };
    }
    
    // Auto-generate period if not provided
    if (!effectivePeriod) {
      const now = new Date();
      effectivePeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // Enrich items with product data
    let enrichedItems = [...itemsArray];
    
    try {
      const products = await getProducts(effectiveLocation);
      
      enrichedItems = enrichedItems.map(item => {
        if (item.productId) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            return {
              ...item,
              product_name: product.name,
              unit: product.unit
            };
          }
        }
        return item;
      });
    } catch (error) {
      dependencies.logger.warn(`Could not enrich items: ${error.message}`);
      // Continue with unenriched items instead of failing
    }
    
    // Save to Google Sheets if available
    try {
      if (dependencies.googleSheetsService.isConnected && dependencies.googleSheetsService.isConnected()) {
        await dependencies.googleSheetsService.saveInventoryItems(enrichedItems, effectiveLocation, effectivePeriod);
      }
    } catch (error) {
      dependencies.logger.error(`Error saving inventory items: ${error.message}`);
      // Continue despite Google Sheets error - we've already logged it
    }
    
    // Return success result
    return {
      success: true,
      savedCount: itemsArray.length,
      location: effectiveLocation,
      period: effectivePeriod,
      items: enrichedItems
    };
  } catch (error) {
    dependencies.logger.error(`Error saving inventory items: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Save invoice data
 * @param {Object} invoice - Invoice data to save
 * @returns {Promise<Object>} - Result with success status
 */
const saveInvoice = async (invoice) => {
  try {
    if (!invoice) {
      dependencies.logger.error('Error saving invoice: Invoice data is required');
      return {
        success: false,
        error: 'Invoice data is required'
      };
    }
    
    const id = invoice.invoiceId || `INV-${Date.now()}`;
    dependencies.logger.info(`Saving invoice: ${invoice.invoiceId || 'unnamed'}`);
    
    return {
      success: true,
      id,
      ...invoice
    };
  } catch (error) {
    dependencies.logger.error(`Error saving invoice: ${error.message}`);
    throw error;
  }
};

/**
 * Get products, optionally filtered by location
 * @param {string} location - Optional location filter
 * @returns {Promise<Array>} - Array of products
 */
const getProducts = async (location) => {
  dependencies.logger.info(`Getting products${location ? ` for location: ${location}` : ''}`);
  
  try {
    // Try to get products from Google Sheets
    let products = [];
    try {
      if (dependencies.googleSheetsService.getProducts) {
        products = await dependencies.googleSheetsService.getProducts();
        if (products && products.length > 0) {
          return location 
            ? products.filter(p => p.location === location)
            : products;
        }
      }
    } catch (error) {
      dependencies.logger.warn(`Could not get products from Google Sheets: ${error.message}`);
    }
    
    // Fall back to mock data
    return location 
      ? mockDb.products.filter(p => p.location === location)
      : [...mockDb.products];
  } catch (error) {
    dependencies.logger.error(`Error getting products: ${error.message}`);
    return [];
  }
};

/**
 * Get inventory items by location
 * @param {string} location - Optional location filter
 * @returns {Promise<Array>} - Array of inventory items
 */
const getInventoryByLocation = async (location) => {
  dependencies.logger.info(`Getting inventory for location: ${location || 'all'}`);
  
  try {
    return location
      ? mockDb.inventory.filter(i => i.location === location)
      : [...mockDb.inventory];
  } catch (error) {
    dependencies.logger.error(`Error getting inventory: ${error.message}`);
    return [];
  }
};

/**
 * Get invoice by ID
 * @param {string} id - Invoice ID
 * @returns {Promise<Object|null>} - Invoice data or null
 */
const getInvoiceById = async (id) => {
  dependencies.logger.info(`Getting invoice by ID: ${id}`);
  
  try {
    return mockDb.invoices.find(i => i.id === id) || null;
  } catch (error) {
    dependencies.logger.error(`Error getting invoice: ${error.message}`);
    return null;
  }
};

/**
 * Set mock database for testing
 * @param {Object} data - Mock database data
 */
const __setMockDb = (data) => {
  mockDb = { ...data };
};

module.exports = {
  initialize,
  findProductByName,
  saveInventoryItems,
  saveInvoice,
  getProducts,
  getInventoryByLocation,
  getInvoiceById,
  __setMockDb,
  __setDependencies
};
