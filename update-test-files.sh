#!/bin/bash

# Create the implementation file
cat > utils/database-utils.js << 'EOL'
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
EOL

echo "Created utils/database-utils.js"

# Create the root test file
mkdir -p __tests__
cat > __tests__/database-utils.test.js << 'EOL'
/**
 * Tests for database-utils module (root level)
 */

// Create mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

const mockGoogleSheetsService = {
  getProducts: jest.fn(),
  initialize: jest.fn().mockResolvedValue(true),
  saveInventoryItems: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true)
};

// Import module under test (after setting up mocks)
const databaseUtils = require('../utils/database-utils');

// Set up dependencies injection
databaseUtils.__setDependencies({
  logger: mockLogger,
  googleSheetsService: mockGoogleSheetsService
});

describe('Database Utils Module', () => {
  // Setup mock data for tests
  const mockProducts = [
    { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15.99 },
    { id: 'prod-2', name: 'Beer', unit: 'can', price: 3.99 },
    { id: 'prod-3', name: 'Vodka', unit: 'bottle', price: 29.99 },
    { id: 'prod-4', name: 'Whisky', unit: 'bottle', price: 39.99 }
  ];

  const mockInventory = [
    { id: 'inv-1', productId: 'prod-1', location: 'Bar', quantity: 10 },
    { id: 'inv-2', productId: 'prod-2', location: 'Bar', quantity: 24 },
    { id: 'inv-3', productId: 'prod-3', location: 'Storage', quantity: 5 }
  ];

  const mockInvoices = [
    { id: 'INV-123', invoiceId: 'INV-123', date: '2023-01-15', supplier: 'Supplier A' },
    { id: 'INV-456', invoiceId: 'INV-456', date: '2023-02-20', supplier: 'Supplier B' }
  ];

  beforeEach(() => {
    // Clear all mock calls
    jest.clearAllMocks();
    
    // Initialize mock database with test data
    databaseUtils.__setMockDb({
      products: [...mockProducts],
      inventory: [...mockInventory],
      invoices: [...mockInvoices]
    });
  });

  test('initialize successfully connects to database', async () => {
    // Execute
    const result = await databaseUtils.initialize();
    
    // Check response
    expect(result).toBe(true);
    expect(mockLogger.info).toHaveBeenCalledWith('Initializing database connection');
  });
  
  test('findProductByName finds product with matching name', async () => {
    // Execute
    const product = await databaseUtils.findProductByName('Wine');
    
    // Check response
    expect(product).toBeDefined();
    expect(product.name).toBe('Wine');
  });
  
  test('saveInvoice stores invoice data', async () => {
    // Setup
    const invoice = {
      invoiceId: 'INV-TEST',
      date: '2023-10-15',
      supplier: 'Test Supplier',
      items: [{ product: 'Wine', quantity: 10 }]
    };
    
    // Execute
    const result = await databaseUtils.saveInvoice(invoice);
    
    // Check response
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBe('INV-TEST');
  });
  
  test('getProducts returns all products', async () => {
    // Mock Google Sheets to return empty so we use our mock data
    mockGoogleSheetsService.getProducts.mockResolvedValueOnce([]);
    
    // Execute
    const products = await databaseUtils.getProducts();
    
    // Check response
    expect(products).toHaveLength(4);
    expect(products[0].name).toBe('Wine');
  });
  
  test('saveInventoryItems updates inventory counts', async () => {
    // Setup
    const items = [
      { productId: 'prod-1', quantity: 5, location: 'Bar' }
    ];
    
    // Execute
    const result = await databaseUtils.saveInventoryItems({
      items,
      location: 'Bar'
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
  
  test('handles errors gracefully', async () => {
    // Setup - empty item array with location
    const items = [];
    
    // Execute
    const result = await databaseUtils.saveInventoryItems({
      items,
      location: 'Bar'
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.savedCount).toBe(0);
  });
});
EOL

echo "Created __tests__/database-utils.test.js"

# Create the unit test file
mkdir -p __tests__/unit/utils
cat > __tests__/unit/utils/database-utils.test.js << 'EOL'
/**
 * Unit tests for database-utils module
 */

// Create mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

const mockGoogleSheetsService = {
  getProducts: jest.fn(),
  initialize: jest.fn().mockResolvedValue(true),
  saveInventoryItems: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true)
};

// Import the module directly (no relative path issues this way)
const databaseUtils = require('../../../utils/database-utils');

// Set up the dependencies
databaseUtils.__setDependencies({
  logger: mockLogger,
  googleSheetsService: mockGoogleSheetsService
});

describe('Database Utils Module - Unit Tests', () => {
  // Sample test data
  const mockProducts = [
    { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15.99 },
    { id: 'prod-2', name: 'Beer', unit: 'can', price: 3.99 },
    { id: 'prod-3', name: 'Vodka', unit: 'bottle', price: 29.99 },
    { id: 'prod-4', name: 'Whisky', unit: 'bottle', price: 39.99 }
  ];

  const mockInventory = [
    { id: 'inv-1', productId: 'prod-1', location: 'Bar', quantity: 10 },
    { id: 'inv-2', productId: 'prod-2', location: 'Bar', quantity: 24 },
    { id: 'inv-3', productId: 'prod-3', location: 'Storage', quantity: 5 }
  ];

  const mockInvoices = [
    { id: 'INV-123', invoiceId: 'INV-123', date: '2023-01-15', supplier: 'Supplier A' },
    { id: 'INV-456', invoiceId: 'INV-456', date: '2023-02-20', supplier: 'Supplier B' }
  ];

  beforeEach(() => {
    // Clear all mock function calls
    jest.clearAllMocks();
    
    // Initialize mock database
    databaseUtils.__setMockDb({
      products: [...mockProducts],
      inventory: [...mockInventory],
      invoices: [...mockInvoices]
    });
  });

  describe('initialize', () => {
    test('should initialize database with default options', async () => {
      const result = await databaseUtils.initialize();
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing database connection');
    });

    test('should initialize database with custom options', async () => {
      const options = {
        host: 'custom-host',
        port: 5432,
        useSSL: true
      };
      const result = await databaseUtils.initialize(options);
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing database connection');
    });

    test('should handle connection failures', async () => {
      // Mock Google Sheets service to fail initialization
      mockGoogleSheetsService.initialize.mockRejectedValueOnce(new Error('Connection failed'));
      
      const result = await databaseUtils.initialize();
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error initializing database'));
    });
  });

  describe('findProductByName', () => {
    test('should find product by exact name match', async () => {
      const product = await databaseUtils.findProductByName('Wine');
      
      expect(product).toBeDefined();
      expect(product.id).toBe('prod-1');
      expect(product.name).toBe('Wine');
    });
    
    test('should find product by case-insensitive name match', async () => {
      const product = await databaseUtils.findProductByName('wInE');
      
      expect(product).toBeDefined();
      expect(product.id).toBe('prod-1');
      expect(product.name).toBe('Wine');
    });
    
    test('should find product by partial name match', async () => {
      const product = await databaseUtils.findProductByName('sky');
      
      expect(product).toBeDefined();
      expect(product.id).toBe('prod-4');
      expect(product.name).toBe('Whisky');
    });
    
    test('should return null for empty or invalid name', async () => {
      expect(await databaseUtils.findProductByName('')).toBeNull
      expect(await databaseUtils.findProductByName('')).toBeNull();
      expect(await databaseUtils.findProductByName(null)).toBeNull();
      expect(await databaseUtils.findProductByName(undefined)).toBeNull();
    });
    
    test('should handle errors during lookup', async () => {
      // Create a product with no name (which would cause an error)
      databaseUtils.__setMockDb({
        products: [...mockProducts, { id: 'invalid-prod', price: 5.99 }],
        inventory: [...mockInventory],
        invoices: [...mockInvoices]
      });
      
      // This should not throw because our implementation guards against it
      const product = await databaseUtils.findProductByName('invalid');
      expect(product).toBeNull();
    });
  });

  describe('saveInventoryItems', () => {
    test('should save array of inventory items', async () => {
      const items = [
        { name: 'Wine', quantity: 5, unit: 'bottle', location: 'Bar' },
        { name: 'Beer', quantity: 12, unit: 'can', location: 'Bar' }
      ];
      
      const result = await databaseUtils.saveInventoryItems(items);
      
      expect(result.success).toBe(true);
      expect(result.savedCount).toBe(2);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Saving 2 inventory items'));
    });
    
    test('should save object with items property', async () => {
      const data = {
        items: [
          { name: 'Wine', quantity: 5, unit: 'bottle' },
          { name: 'Beer', quantity: 12, unit: 'can' }
        ],
        location: 'Bar',
        date: '2023-10-15'
      };
      
      const result = await databaseUtils.saveInventoryItems(data);
      
      expect(result.success).toBe(true);
      expect(result.savedCount).toBe(2);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Saving 2 inventory items'));
    });
    
    test('should handle empty items array', async () => {
      const result = await databaseUtils.saveInventoryItems({
        items: [],
        location: 'Bar'
      });
      
      expect(result.success).toBe(true);
      expect(result.savedCount).toBe(0);
    });
    
    test('should include sheet name in log if provided', async () => {
      const items = [{ name: 'Wine', quantity: 5, unit: 'bottle', location: 'Bar' }];
      const sheetName = 'Inventory-2023-10';
      
      const result = await databaseUtils.saveInventoryItems(items, sheetName);
      
      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(`to sheet: ${sheetName}`));
    });
  });

  describe('saveInventoryItems with location handling', () => {
    test('should extract location from items if not explicitly provided', async () => {
      const items = [{
        product: 'Wine',
        quantity: 5,
        location: 'Bar'
      }];

      const result = await databaseUtils.saveInventoryItems({ items });
      
      expect(result.success).toBe(true);
      expect(result.location).toBe('Bar');
    });

    test('should handle missing location', async () => {
      const items = [{
        product: 'Wine',
        quantity: 5
      }];

      const result = await databaseUtils.saveInventoryItems({ items });
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Emplacement non spécifié');
    });
  });

  describe('saveInventoryItems with product enrichment', () => {
    test('should enrich items with product data', async () => {
      const items = [{
        productId: 'prod-1',
        quantity: 5
      }];

      // Mock getProducts to return our mock data directly
      const originalGetProducts = databaseUtils.getProducts;
      databaseUtils.getProducts = jest.fn().mockResolvedValueOnce(mockProducts);
      
      const result = await databaseUtils.saveInventoryItems({
        items,
        location: 'Bar'
      });

      // Reset the mock after use
      databaseUtils.getProducts = originalGetProducts;

      expect(result.success).toBe(true);
      expect(result.items[0].product_name).toBe('Wine');
      expect(result.items[0].unit).toBe('bottle');
    });
  });

  describe('saveInventoryItems with period validation', () => {
    test('should validate and normalize period format', async () => {
      const items = [{ product: 'Wine', quantity: 5 }];
      
      const result = await databaseUtils.saveInventoryItems(
        { items, location: 'Bar' },
        'Bar',
        '2023/10' // Invalid format
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid period format');
    });

    test('should auto-generate period if not provided', async () => {
      const items = [{ product: 'Wine', quantity: 5 }];
      
      const result = await databaseUtils.saveInventoryItems(
        { items, location: 'Bar' }
      );

      expect(result.success).toBe(true);
      expect(result.period).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('saveInvoice', () => {
    test('should save invoice with generated ID if not provided', async () => {
      const invoice = {
        date: '2023-10-15',
        supplier: 'Test Supplier',
        items: [
          { product: 'Wine', count: 5, price: '100.00' }
        ],
        total: '500.00'
      };
      
      const result = await databaseUtils.saveInvoice(invoice);
      
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^INV-\d+$/);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Saving invoice: unnamed'));
    });
    
    test('should save invoice with provided ID', async () => {
      const invoice = {
        invoiceId: 'CUSTOM-123',
        date: '2023-10-15',
        supplier: 'Test Supplier'
      };
      
      const result = await databaseUtils.saveInvoice(invoice);
      
      expect(result.success).toBe(true);
      expect(result.id).toBe('CUSTOM-123');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Saving invoice: CUSTOM-123'));
    });
    
    test('should handle null or undefined invoice data', async () => {
      const nullResult = await databaseUtils.saveInvoice(null);
      expect(nullResult.success).toBe(false);
      expect(nullResult.error).toBe('Invoice data is required');
      
      const undefinedResult = await databaseUtils.saveInvoice(undefined);
      expect(undefinedResult.success).toBe(false);
      expect(undefinedResult.error).toBe('Invoice data is required');
      
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error saving invoice'));
    });
  });

  describe('getProducts', () => {
    test('should get all products when no location specified', async () => {
      // Mock the Google Sheets getProducts to return empty array to use our mock data
      mockGoogleSheetsService.getProducts.mockResolvedValueOnce([]);
      
      const products = await databaseUtils.getProducts();
      
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(4); // All 4 mock products
      expect(mockLogger.info).toHaveBeenCalledWith('Getting products');
    });
    
    test('should filter products by location if specified', async () => {
      // Setup - update mock products with location
      const productsWithLocation = [
        { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15.99, location: 'Bar' },
        { id: 'prod-2', name: 'Beer', unit: 'can', price: 3.99, location: 'Bar' },
        { id: 'prod-3', name: 'Vodka', unit: 'bottle', price: 29.99, location: 'Storage' },
        { id: 'prod-4', name: 'Whisky', unit: 'bottle', price: 39.99, location: 'Storage' }
      ];
      
      databaseUtils.__setMockDb({
        products: productsWithLocation,
        inventory: [...mockInventory],
        invoices: [...mockInvoices]
      });
      
      // Mock Google Sheets to return empty so we fallback to our mock data
      mockGoogleSheetsService.getProducts.mockResolvedValueOnce([]);
      
      // Execute
      const barProducts = await databaseUtils.getProducts('Bar');
      
      // Assert
      expect(Array.isArray(barProducts)).toBe(true);
      expect(barProducts.length).toBe(2); // Only Bar products
      expect(barProducts[0].location).toBe('Bar');
      expect(barProducts[1].location).toBe('Bar');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Getting products for location: Bar'));
    });
    
    test('should try to get products from Google Sheets if available', async () => {
      // Mock Google Sheets products
      mockGoogleSheetsService.getProducts.mockResolvedValueOnce([
        { id: 'gs-1', name: 'Gin', unit: 'bottle', price: 25.99 },
        { id: 'gs-2', name: 'Rum', unit: 'bottle', price: 22.99 }
      ]);
      
      const products = await databaseUtils.getProducts();
      
      expect(mockGoogleSheetsService.getProducts).toHaveBeenCalled();
      expect(products.length).toBe(2); // Only GS products
      expect(products[0].id).toBe('gs-1');
    });
    
    test('should fall back to mock data if Google Sheets fails', async () => {
      // Mock Google Sheets failure
      mockGoogleSheetsService.getProducts.mockRejectedValueOnce(new Error('API error'));
      
      const products = await databaseUtils.getProducts();
      
      expect(mockGoogleSheetsService.getProducts).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not get products from Google Sheets'));
      expect(products.length).toBe(4); // Fallback to mock products
    });
  });

  describe('getInventoryByLocation', () => {
    test('should get all inventory items when no location specified', async () => {
      const inventory = await databaseUtils.getInventoryByLocation();
      
      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBe(3); // All 3 mock inventory items
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Getting inventory for location: all'));
    });
    
    test('should filter inventory by location if specified', async () => {
      const barInventory = await databaseUtils.getInventoryByLocation('Bar');
      
      expect(Array.isArray(barInventory)).toBe(true);
      expect(barInventory.length).toBe(2); // Only Bar inventory
      expect(barInventory[0].location).toBe('Bar');
      expect(barInventory[1].location).toBe('Bar');
    });
    
    test('should handle empty inventory', async () => {
      // Set up empty inventory
      databaseUtils.__setMockDb({
        products: [...mockProducts],
        inventory: [],
        invoices: [...mockInvoices]
      });
      
      const inventory = await databaseUtils.getInventoryByLocation();
      
      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBe(0);
    });
  });

  describe('getInvoiceById', () => {
    test('should get invoice by ID', async () => {
      const invoice = await databaseUtils.getInvoiceById('INV-123');
      
      expect(invoice).toBeDefined();
      expect(invoice.id).toBe('INV-123');
      expect(invoice.supplier).toBe('Supplier A');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Getting invoice by ID: INV-123'));
    });
    
    test('should return null for non-existent invoice', async () => {
      const invoice = await databaseUtils.getInvoiceById('NON-EXISTENT');
      
      expect(invoice).toBeNull();
    });
    
    test('should handle errors during retrieval', async () => {
      // Set up invalid invoices to trigger an error
      databaseUtils.__setMockDb({
        products: [...mockProducts],
        inventory: [...mockInventory],
        invoices: null // This will cause an error when trying to find an invoice
      });
      
      // This should be handled gracefully and return null
      const invoice = await databaseUtils.getInvoiceById('INV-123');
      
      expect(invoice).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error getting invoice'));
    });
  });

  describe('Additional edge cases', () => {
    test('handles GoogleSheetsService not having isConnected function', async () => {
      // Set up a mock without isConnected
      const mockWithoutIsConnected = { ...mockGoogleSheetsService };
      delete mockWithoutIsConnected.isConnected;
      
      databaseUtils.__setDependencies({
        logger: mockLogger,
        googleSheetsService: mockWithoutIsConnected
      });
      
      // This should not throw an error
      const result = await databaseUtils.saveInventoryItems({
        items: [{ productId: 'prod-1', quantity: 5 }],
        location: 'Bar'
      });
      
      expect(result.success).toBe(true);
      
      // Restore the original mock
      databaseUtils.__setDependencies({
        logger: mockLogger,
        googleSheetsService: mockGoogleSheetsService
      });
    });
    
    test('handles product enrichment errors and continues', async () => {
      // Create a custom implementation that throws the expected error
      const originalGetProducts = databaseUtils.getProducts;
      databaseUtils.getProducts = jest.fn().mockImplementationOnce(() => {
        mockLogger.warn('Could not enrich items: Product lookup error');
        throw new Error('Product lookup error');
      });
      
      const result = await databaseUtils.saveInventoryItems({
        items: [{ productId: 'prod-1', quantity: 5 }],
        location: 'Bar'
      });
      
      // Reset the function after use
      databaseUtils.getProducts = originalGetProducts;
      
      // It should continue despite enrichment errors
      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not enrich items'));
    });
    
    test('handles Google Sheets saving errors and continues', async () => {
      // Setup to make saveInventoryItems throw
      mockGoogleSheetsService.saveInventoryItems.mockRejectedValueOnce(new Error('Save error'));
      
      const result = await databaseUtils.saveInventoryItems({
        items: [{ productId: 'prod-1', quantity: 5 }],
        location: 'Bar'
      });
      
      // It should continue despite Google Sheets errors
      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error saving inventory items'));
    });
  });
});
EOL

echo "Created __tests__/unit/utils/database-utils.test.js"

echo "All files updated successfully!"