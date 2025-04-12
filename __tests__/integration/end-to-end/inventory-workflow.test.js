const request = require('supertest');
const app = require('../../../app');
const dbUtils = require('../../../utils/database-utils');

// Save original implementation
const originalGetProducts = dbUtils.getProducts;
const originalGetInventoryByLocation = dbUtils.getInventoryByLocation;

describe('Inventory Workflow End-to-End', () => {
  beforeEach(() => {
    // Mock the database utils
    dbUtils.getProducts = jest.fn().mockResolvedValue([
      { id: 'prod-1', name: 'Wine', price: 15.99, unit: 'bottle' },
      { id: 'prod-2', name: 'Beer', price: 3.99, unit: 'can' },
      { id: 'prod-3', name: 'Vodka', price: 29.99, unit: 'bottle' }
    ]);
    
    dbUtils.getInventoryByLocation = jest.fn().mockResolvedValue([
      { id: 'inv-1', productId: 'prod-1', quantity: 10, location: 'Bar' },
      { id: 'inv-2', productId: 'prod-2', quantity: 5, location: 'Bar' }
    ]);
  });
  
  afterEach(() => {
    // Restore original implementations
    dbUtils.getProducts = originalGetProducts;
    dbUtils.getInventoryByLocation = originalGetInventoryByLocation;
  });
  
  it('should complete a full inventory workflow', async () => {
    // Step 1: Get products
    const productsResponse = await request(app)
      .get('/api/inventory/products')
      .set('x-api-key', 'test-api-key')
      .set('x-skip-auth', 'true'); // Use our new bypass header
    
    console.log('Products Response:', productsResponse.body);
    
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body.success).toBe(true);
    expect(Array.isArray(productsResponse.body.data)).toBe(true);
    expect(productsResponse.body.data.length).toBe(3);
    expect(productsResponse.body.data[0]).toHaveProperty('name');
    
    // Verify mock was called
    expect(dbUtils.getProducts).toHaveBeenCalled();
    
    // Step 2: Get inventory for a location
    const inventoryResponse = await request(app)
      .get('/api/inventory')
      .query({ location: 'Bar' })
      .set('x-api-key', 'test-api-key')
      .set('x-skip-auth', 'true'); // Use our new bypass header
    
    console.log('Inventory Response:', inventoryResponse.body);
    
    expect(inventoryResponse.status).toBe(200);
    expect(inventoryResponse.body.success).toBe(true);
    expect(Array.isArray(inventoryResponse.body.data)).toBe(true);
    
    // Verify mock was called with correct args
    expect(dbUtils.getInventoryByLocation).toHaveBeenCalledWith('Bar');
  });
});
