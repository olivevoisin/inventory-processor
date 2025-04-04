const googleSheetsService = require('../../modules/google-sheets-service');
const logger = require('../../utils/logger');

// Mock the logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Google Sheets Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    test('should return an array of products', async () => {
      const products = await googleSheetsService.getProducts();
      
      // Log should be called
      expect(logger.info).toHaveBeenCalledWith('Fetching products from Google Sheets');
      
      // Result should be an array of products
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      
      // Each product should have the expected properties
      products.forEach(product => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('unit');
        expect(product).toHaveProperty('price');
      });
    });
  });

  describe('getInventory', () => {
    test('should return inventory items for a given location and period', async () => {
      const location = 'Bar';
      const period = '2023-10';
      
      const inventory = await googleSheetsService.getInventory(location, period);
      
      // Log should be called with the right parameters
      expect(logger.info).toHaveBeenCalledWith(`Fetching inventory for ${location} in period ${period}`);
      
      // Result should be an array of inventory items
      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBeGreaterThan(0);
      
      // Each item should have the expected properties
      inventory.forEach(item => {
        expect(item).toHaveProperty('productId');
        expect(item).toHaveProperty('product_name');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('unit');
      });
    });
  });

  describe('saveInventoryItems', () => {
    test('should save inventory items and return result', async () => {
      const items = [
        { productId: 'prod-1', product_name: 'Wine', quantity: 10, unit: 'bottle' },
        { productId: 'prod-2', product_name: 'Beer', quantity: 24, unit: 'can' }
      ];
      const location = 'Bar';
      const period = '2023-10';
      
      const result = await googleSheetsService.saveInventoryItems(items, location, period);
      
      // Log should be called with the right parameters
      expect(logger.info).toHaveBeenCalledWith(`Saving ${items.length} inventory items for ${location} in period ${period}`);
      
      // Should return a result object with saved count and errors
      expect(result).toHaveProperty('saved');
      expect(result).toHaveProperty('errors');
      expect(result.saved).toBe(items.length);
      expect(result.errors).toBe(0);
    });
    
    test('should handle empty items array', async () => {
      const items = [];
      const location = 'Bar';
      const period = '2023-10';
      
      const result = await googleSheetsService.saveInventoryItems(items, location, period);
      
      // Should still return a valid result
      expect(result).toHaveProperty('saved');
      expect(result).toHaveProperty('errors');
      expect(result.saved).toBe(0);
    });
  });

  describe('saveProduct', () => {
    test('should save a product and return it with an ID', async () => {
      const product = {
        name: 'Whiskey',
        unit: 'bottle',
        price: 45.99
      };
      
      const savedProduct = await googleSheetsService.saveProduct(product);
      
      // Log should be called
      expect(logger.info).toHaveBeenCalledWith(`Saving product: ${product.name}`);
      
      // Should return the product with an ID
      expect(savedProduct).toHaveProperty('id');
      expect(savedProduct.name).toBe(product.name);
      expect(savedProduct.unit).toBe(product.unit);
      expect(savedProduct.price).toBe(product.price);
    });
    
    test('should preserve existing ID when saving a product', async () => {
      const product = {
        id: 'existing-id',
        name: 'Gin',
        unit: 'bottle',
        price: 35.99
      };
      
      const savedProduct = await googleSheetsService.saveProduct(product);
      
      // Should preserve the existing ID
      expect(savedProduct.id).toBe('existing-id');
    });
  });

  describe('initialize', () => {
    test('should initialize the Google Sheets connection', async () => {
      const result = await googleSheetsService.initialize();
      
      // Log should be called
      expect(logger.info).toHaveBeenCalledWith('Initializing Google Sheets connection');
      
      // Should return true on success
      expect(result).toBe(true);
    });
  });

  describe('isConnected', () => {
    test('should return connection status', () => {
      const status = googleSheetsService.isConnected();
      
      // Should return a boolean value
      expect(typeof status).toBe('boolean');
    });
  });
});
