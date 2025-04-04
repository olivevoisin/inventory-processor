const request = require('supertest');
const app = require('../../../app');
const dbUtils = require('../../../utils/database-utils');

// Mock the database utils
jest.mock('../../../utils/database-utils', () => ({
  getProducts: jest.fn().mockResolvedValue([
    { id: 1, name: 'Wine', unit: 'bottle' },
    { id: 2, name: 'Beer', unit: 'can' }
  ]),
  getInventoryByLocation: jest.fn().mockResolvedValue([
    { product: 'Wine', quantity: 5 },
    { product: 'Beer', quantity: 10 }
  ]),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true })
}));

// Load API key from environment
const apiKey = process.env.API_KEY || 'test-api-key';

describe('Inventory API Endpoints', () => {
  it('GET /api/inventory/products returns list of products', async () => {
    const response = await request(app)
      .get('/api/inventory/products')
      .set('x-api-key', apiKey);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(dbUtils.getProducts).toHaveBeenCalled();
  });
  
  it('GET /api/inventory returns inventory for a location', async () => {
    const response = await request(app)
      .get('/api/inventory')
      .query({ location: 'main' })
      .set('x-api-key', apiKey);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(dbUtils.getInventoryByLocation).toHaveBeenCalledWith('main');
  });
  
  it('POST /api/inventory updates inventory items', async () => {
    const inventoryData = [
      { productId: 1, quantity: 10, location: 'bar' },
      { productId: 2, quantity: 5, location: 'bar' }
    ];
    
    const response = await request(app)
      .post('/api/inventory')
      .set('x-api-key', apiKey)
      .send(inventoryData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(dbUtils.saveInventoryItems).toHaveBeenCalledWith(inventoryData);
  });
  
  it('POST /api/inventory validates request body', async () => {
    // For this specific test, we need to make sure we're getting an error
    // when the body is invalid
    const invalidData = { not_an_array: true };
    
    // Mock saveInventoryItems to reject for this test
    dbUtils.saveInventoryItems.mockRejectedValueOnce(new Error('Invalid data format'));
    
    const response = await request(app)
      .post('/api/inventory')
      .set('x-api-key', apiKey)
      .send(invalidData);
    
    // Should not return 200 - it should return an error status code
    expect(response.status).toBe(400);
  });
});
