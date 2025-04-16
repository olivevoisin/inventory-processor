const request = require('supertest');
const app = require('../../app');
const dbUtils = require('../../utils/database-utils');

// Mock du module d'utilitaires de base de données
jest.mock('../../utils/database-utils', () => ({
  getProducts: jest.fn().mockResolvedValue([
    { name: 'Vodka Grey Goose', unit: 'bottle', price: 29.99, location: 'boisson_maison' },
    { name: 'Wine Cabernet', unit: 'bottle', price: 15.99, location: 'boisson_maison' },
    { name: 'Beer IPA', unit: 'can', price: 3.99, location: 'boisson_bicoque' }
  ]),
  getInventoryByLocation: jest.fn().mockImplementation((location) => {
    const inventory = [
      { name: 'Vodka Grey Goose', quantity: 10, unit: 'bottle', location: 'boisson_maison' },
      { name: 'Wine Cabernet', quantity: 15, unit: 'bottle', location: 'boisson_maison' },
      { name: 'Beer IPA', quantity: 24, unit: 'can', location: 'boisson_bicoque' }
    ];
    
    if (location) {
      return Promise.resolve(inventory.filter(item => item.location === location));
    }
    
    return Promise.resolve(inventory);
  }),
  saveInventoryItems: jest.fn().mockResolvedValue({
    success: true,
    savedCount: 2,
    errorCount: 0
  })
}));

describe('Inventory Routes', () => {
  beforeEach(() => {
    // Ensure SKIP_AUTH is not set for 401 tests
    delete process.env.SKIP_AUTH;
  });

  // Test de la route GET /api/inventory/products
  describe('GET /api/inventory/products', () => {
    it('should return all products when authorized', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      
      // Act & Assert
      await request(app)
        .get('/api/inventory/products')
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          // Accept both array and object with products property
          let products = Array.isArray(res.body) ? res.body : res.body.products;
          // Fallback: if neither, try res.body.data or log for debug
          if (!Array.isArray(products)) {
            // Try common alternatives or print for debug
            products = res.body.data || [];
            // Optionally: console.log('Unexpected response:', res.body);
          }
          expect(Array.isArray(products)).toBe(true);
          expect(products.length).toBe(3);
          expect(products[0]).toHaveProperty('name');
          expect(products[0]).toHaveProperty('unit');
          expect(products[0]).toHaveProperty('price');
        });
      
      // Verify
      expect(dbUtils.getProducts).toHaveBeenCalledTimes(1);
    });
    
    it('should return 401 when no API key is provided', async () => {
      // Act & Assert
      await request(app)
        .get('/api/inventory/products')
        .expect(401);
    });
  });
  
  // Test de la route GET /api/inventory
  describe('GET /api/inventory', () => {
    it('should return inventory filtered by location', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const location = 'boisson_maison';
      
      // Act & Assert
      await request(app)
        .get('/api/inventory')
        .query({ location })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          // Accept both array and object with inventory property
          let inventory = Array.isArray(res.body) ? res.body : res.body.inventory;
          if (!Array.isArray(inventory)) {
            inventory = res.body.data || [];
            // Optionally: console.log('Unexpected response:', res.body);
          }
          expect(Array.isArray(inventory)).toBe(true);
          expect(inventory.length).toBe(2);
          expect(inventory[0]).toHaveProperty('name');
          expect(inventory[0]).toHaveProperty('quantity');
          expect(inventory[0]).toHaveProperty('unit');
          expect(inventory[0].location).toBe(location);
        });
      
      // Verify
      expect(dbUtils.getInventoryByLocation).toHaveBeenCalledWith(location);
    });
    
    it('should return 400 when no location is provided', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      
      // Act & Assert
      await request(app)
        .get('/api/inventory')
        .set('x-api-key', apiKey)
        .expect(400);
    });
  });
  
  // Test de la route POST /api/inventory
  describe('POST /api/inventory', () => {
    it('should save inventory items and return success', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const inventoryItems = [
        { productId: '1', quantity: 10, location: 'boisson_maison' },
        { productId: '2', quantity: 5, location: 'boisson_maison' }
      ];
      
      // Act & Assert
      await request(app)
        .post('/api/inventory')
        .set('x-api-key', apiKey)
        .send(inventoryItems)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.savedCount).toBe(2);
          expect(res.body.errorCount).toBe(0);
        });
      
      // Verify
      expect(dbUtils.saveInventoryItems).toHaveBeenCalledWith(inventoryItems);
    });
    
    it('should return 400 when body is not an array', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const invalidBody = {
        productId: '1',
        quantity: 10,
        location: 'boisson_maison'
      };
      
      // Act & Assert
      await request(app)
        .post('/api/inventory')
        .set('x-api-key', apiKey)
        .send(invalidBody)
        .expect(400);
    });
    
    it('should return 401 when no API key is provided', async () => {
      // Arrange
      const inventoryItems = [
        { productId: '1', quantity: 10, location: 'boisson_maison' }
      ];
      
      // Act & Assert
      await request(app)
        .post('/api/inventory')
        .send(inventoryItems)
        .expect(401);
    });
  });
});
