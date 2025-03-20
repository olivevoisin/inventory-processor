const request = require('supertest');
const express = require('express');

// Mock the database utils
jest.mock('../../../utils/database-utils', () => ({
  getProducts: jest.fn().mockResolvedValue([
    { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 },
    { id: 'prod-2', name: 'Beer', unit: 'can', price: 5 }
  ]),
  getInventoryByLocation: jest.fn().mockResolvedValue([
    { productId: 'prod-1', quantity: 10, location: 'main' }
  ]),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true })
}), { virtual: true });

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

// Mock auth middleware
jest.mock('../../../middleware/auth', () => ({
  authenticateApiKey: (req, res, next) => next()
}), { virtual: true });

// Mock monitoring
jest.mock('../../../utils/monitoring', () => ({
  recordApiUsage: jest.fn()
}), { virtual: true });

describe('Inventory API Endpoints', () => {
  let app;
  let dbUtils;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Load mocked modules
    dbUtils = require('../../../utils/database-utils');
    
    // Create a fresh Express app
    app = express();
    
    // Add JSON parsing middleware
    app.use(express.json());
    
    // Import routes
    try {
      const inventoryRoutes = require('../../../routes/inventory-routes');
      app.use('/api/inventory', inventoryRoutes);
    } catch (error) {
      console.error('Error loading inventory routes:', error.message);
    }
  });
  
  test('GET /api/inventory/products returns list of products', async () => {
    // Skip if app wasn't properly set up
    if (!app) {
      console.warn('Skipping test: app not available');
      return;
    }
    
    const response = await request(app).get('/api/inventory/products');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0]).toHaveProperty('name');
    expect(dbUtils.getProducts).toHaveBeenCalled();
  });
  
  test('GET /api/inventory returns inventory for a location', async () => {
    // Skip if app wasn't properly set up
    if (!app) {
      console.warn('Skipping test: app not available');
      return;
    }
    
    const response = await request(app)
      .get('/api/inventory')
      .query({ location: 'main' });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(dbUtils.getInventoryByLocation).toHaveBeenCalledWith('main');
  });
  
  test('POST /api/inventory updates inventory items', async () => {
    // Skip if app wasn't properly set up
    if (!app) {
      console.warn('Skipping test: app not available');
      return;
    }
    
    const inventoryUpdate = [
      { productId: 'prod-1', quantity: 5, location: 'main' }
    ];
    
    const response = await request(app)
      .post('/api/inventory')
      .send(inventoryUpdate);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
    expect(dbUtils.saveInventoryItems).toHaveBeenCalledWith(inventoryUpdate);
  });
  
  test('POST /api/inventory validates request body', async () => {
    // Skip if app wasn't properly set up
    if (!app) {
      console.warn('Skipping test: app not available');
      return;
    }
    
    // Missing required fields
    const invalidUpdate = [
      { productId: 'prod-1' } // missing quantity and location
    ];
    
    const response = await request(app)
      .post('/api/inventory')
      .send(invalidUpdate);
    
    expect(response.status).toBe(400);
  });
});
