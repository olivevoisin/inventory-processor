const request = require('supertest');
const app = require('../../../app');
const dbUtils = require('../../../utils/database-utils');

// Mock the database utils to return predictable data
jest.mock('../../../utils/database-utils', () => ({
  getProducts: jest.fn().mockResolvedValue([
    { id: 1, name: 'Wine', unit: 'bottle', price: '15.99' },
    { id: 2, name: 'Beer', unit: 'can', price: '4.99' },
    { id: 3, name: 'Vodka', unit: 'bottle', price: '25.99' }
  ]),
  getInventoryByLocation: jest.fn().mockImplementation((location) => {
    if (location === 'boisson_maison') {
      return Promise.resolve([
        { product: 'Wine', quantity: 5, location: 'boisson_maison' },
        { product: 'Beer', quantity: 10, location: 'boisson_maison' }
      ]);
    }
    return Promise.resolve([]);
  }),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true, savedCount: 2 })
}));

// Get API key from environment or use a fixed test key
const apiKey = process.env.API_KEY || 'test-api-key';

describe('Inventory Workflow End-to-End', () => {
  // Make sure we're in test mode
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });
  
  it('should complete a full inventory workflow', async () => {
    // Step 1: Get all products
    const productsResponse = await request(app)
      .get('/api/inventory/products')
      .set('x-api-key', apiKey)
      .expect(200);
    
    expect(Array.isArray(productsResponse.body)).toBe(true);
    expect(productsResponse.body.length).toBe(3);
    
    // Step 2: Get inventory for a location
    const inventoryResponse = await request(app)
      .get('/api/inventory')
      .query({ location: 'boisson_maison' })
      .set('x-api-key', apiKey)
      .expect(200);
    
    expect(Array.isArray(inventoryResponse.body)).toBe(true);
    expect(inventoryResponse.body.length).toBe(2);
    
    // Step 3: Update inventory
    const inventoryItems = [
      { productId: 1, quantity: 8, location: 'boisson_maison' },
      { productId: 2, quantity: 15, location: 'boisson_maison' }
    ];
    
    const updateResponse = await request(app)
      .post('/api/inventory')
      .set('x-api-key', apiKey)
      .send(inventoryItems)
      .expect(200);
    
    expect(updateResponse.body.success).toBe(true);
    
    // Verify that all required functions were called
    expect(dbUtils.getProducts).toHaveBeenCalled();
    expect(dbUtils.getInventoryByLocation).toHaveBeenCalledWith('boisson_maison');
    expect(dbUtils.saveInventoryItems).toHaveBeenCalledWith(inventoryItems);
  });
});
