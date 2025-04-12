/**
 * Database Utilities Module
 * Handles database operations for inventory management
 */
const logger = require('./logger');

// In-memory data store for demonstration
const inMemoryDb = {
  products: [
    { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 },
    { id: 'prod-2', name: 'Beer', unit: 'can', price: 5 },
    { id: 'prod-3', name: 'Vodka', unit: 'bottle', price: 25 },
    { id: 'prod-4', name: 'Whiskey', unit: 'bottle', price: 30 }
  ],
  inventoryItems: []
};

/**
 * Find product by name with fuzzy matching
 * @param {string} name - Product name to search for
 * @returns {Promise<Object|null>} - Matching product or null
 */
async function findProductByName(name) {
  try {
    if (!name || typeof name !== 'string') {
      return null;
    }
    
    const normalizedName = name.toLowerCase().trim();
    
    // Simple fuzzy matching - find products containing the name
    const matches = inMemoryDb.products.filter(product => 
      product.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(product.name.toLowerCase())
    );
    
    // Return the first match or null
    return matches.length > 0 ? { ...matches[0] } : null;
  } catch (error) {
    logger.error(`Error finding product by name: ${error.message}`);
    return null;
  }
}

/**
 * Find products by partial name (for autocomplete)
 * @param {string} partialName - Partial product name
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of matching products
 */
async function findProductsByPartialName(partialName, limit = 10) {
  try {
    if (!partialName || typeof partialName !== 'string') {
      return [];
    }
    
    const normalizedName = partialName.toLowerCase().trim();
    
    // Find products containing the partial name
    const matches = inMemoryDb.products
      .filter(product => product.name.toLowerCase().includes(normalizedName))
      .slice(0, limit);
    
    return matches.map(product => ({ ...product }));
  } catch (error) {
    logger.error(`Error finding products by partial name: ${error.message}`);
    return [];
  }
}

/**
 * Save inventory items
 * @param {Array} items - Inventory items to save
 * @returns {Promise<Object>} - Save result
 */
async function saveInventoryItems(items) {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, message: 'No items to save' };
    }
    
    // Process and save each item
    const savedItems = [];
    const errors = [];
    
    for (const item of items) {
      try {
        // Ensure item has the required fields
        if (!item.product_name) {
          errors.push({ item, error: 'Missing product name' });
          continue;
        }
        
        // Generate ID if not provided
        const itemWithId = {
          ...item,
          id: item.id || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: item.timestamp || new Date().toISOString()
        };
        
        // Add to in-memory database
        inMemoryDb.inventoryItems.push(itemWithId);
        savedItems.push(itemWithId);
      } catch (itemError) {
        errors.push({ item, error: itemError.message });
      }
    }
    
    return {
      success: true,
      savedCount: savedItems.length,
      errorCount: errors.length,
      savedItems,
      errors
    };
  } catch (error) {
    logger.error(`Error saving inventory items: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get inventory items with optional filtering
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} - Filtered inventory items
 */
async function getInventoryItems(options = {}) {
  try {
    let items = [...inMemoryDb.inventoryItems];
    
    // Apply filters
    if (options.location) {
      items = items.filter(item => item.location === options.location);
    }
    
    if (options.category) {
      items = items.filter(item => item.category === options.category);
    }
    
    if (options.startDate) {
      const startDate = new Date(options.startDate);
      items = items.filter(item => new Date(item.timestamp) >= startDate);
    }
    
    if (options.endDate) {
      const endDate = new Date(options.endDate);
      items = items.filter(item => new Date(item.timestamp) <= endDate);
    }
    
    // Apply pagination
    if (options.limit) {
      const offset = options.offset || 0;
      items = items.slice(offset, offset + options.limit);
    }
    
    return items;
  } catch (error) {
    logger.error(`Error getting inventory items: ${error.message}`);
    return [];
  }
}

/**
 * Count inventory items with optional filtering
 * @param {Object} options - Filter options
 * @returns {Promise<number>} - Count of matching items
 */
async function countInventoryItems(options = {}) {
  try {
    let count = inMemoryDb.inventoryItems.length;
    
    // Apply filters
    if (options.location) {
      count = inMemoryDb.inventoryItems.filter(item => 
        item.location === options.location
      ).length;
    }
    
    if (options.category) {
      count = inMemoryDb.inventoryItems.filter(item => 
        item.category === options.category
      ).length;
    }
    
    return count;
  } catch (error) {
    logger.error(`Error counting inventory items: ${error.message}`);
    return 0;
  }
}

/**
 * Get inventory item by ID
 * @param {string} id - Item ID
 * @returns {Promise<Object|null>} - Inventory item or null if not found
 */
async function getInventoryItemById(id) {
  try {
    const item = inMemoryDb.inventoryItems.find(item => item.id === id);
    return item ? { ...item } : null;
  } catch (error) {
    logger.error(`Error getting inventory item by ID: ${error.message}`);
    return null;
  }
}

/**
 * Delete inventory item by ID
 * @param {string} id - Item ID
 * @returns {Promise<boolean>} - Success flag
 */
async function deleteInventoryItem(id) {
  try {
    const index = inMemoryDb.inventoryItems.findIndex(item => item.id === id);
    
    if (index === -1) {
      return false;
    }
    
    inMemoryDb.inventoryItems.splice(index, 1);
    return true;
  } catch (error) {
    logger.error(`Error deleting inventory item: ${error.message}`);
    return false;
  }
}

/**
 * Add a new product to the database
 * @param {Object} product - Product to add
 * @returns {Promise<Object>} - Added product
 */
async function addProduct(product) {
  try {
    // Validate product
    if (!product.name) {
      throw new Error('Product name is required');
    }
    
    // Generate ID if not provided
    const productWithId = {
      ...product,
      id: product.id || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    
    // Add to in-memory database
    inMemoryDb.products.push(productWithId);
    
    return { ...productWithId };
  } catch (error) {
    logger.error(`Error adding product: ${error.message}`);
    throw error;
  }
}

/**
 * Get all products
 * @returns {Promise<Array>} - All products
 */
async function getProducts() {
  try {
    return [...inMemoryDb.products];
  } catch (error) {
    logger.error(`Error getting products: ${error.message}`);
    return [];
  }
}

module.exports = {
  findProductByName,
  findProductsByPartialName,
  saveInventoryItems,
  getInventoryItems,
  countInventoryItems,
  getInventoryItemById,
  deleteInventoryItem,
  addProduct,
  getProducts
};
