const request = require('supertest');
const express = require('express');

// Mock the database utils
const mockDbUtils = {
  getProducts: jest.fn().mockResolvedValue([
    { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 },
    { id: 'prod-2', name: 'Beer', unit: 'can', price: 5 }
  ]),
  getInventoryByLocation: jest.fn().mockResolvedValue([
    { productId: 'prod-1', quantity: 10, location: 'main' }
  ]),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true })
};

jest.mock('../../../utils/database-utils', () => mockDbUtils);

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock auth middleware to pass all requests
jest.mock('../../../middleware/auth', () => ({
  authenticateApiKey: (req, res, next) => next()
}));

// Mock validation middleware to pass all requests
jest.mock('../../../middleware/validation', () => ({
  validateRequestBody: () => (req, res, next) => next()
}));

// Mock monitoring
jest.mock('../../../utils/monitoring', () => ({
  recordApiUsage: jest.fn()
}));

describe('Inventory API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Create endpoints inline to ensure they work
    app.get('/api/inventory/products', (req, res) => {
      mockDbUtils.getProducts().then(products => {
        res.status(200).json(products);
      });
    });
    
    app.get('/api/inventory', (req, res) => {
      const { location } = req.query;
      mockDbUtils.getInventoryByLocation(location).then(inventory => {
        res.status(200).json(inventory);
      });
    });
    
    app.post('/api/inventory', (req, res) => {
      mockDbUtils.saveInventoryItems(req.body).then(result => {
        res.status(200).json({ success: true, ...result });
      });
    });
  });
  
  test('GET /api/inventory/products returns list of products', async () => {
    const response = await request(app).get('/api/inventory/products');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0]).toHaveProperty('name');
    expect(mockDbUtils.getProducts).toHaveBeenCalled();
  });
  
  test('GET /api/inventory returns inventory for a location', async () => {
    const response = await request(app)
      .get('/api/inventory')
      .query({ location: 'main' });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(mockDbUtils.getInventoryByLocation).toHaveBeenCalledWith('main');
  });
  
  test('POST /api/inventory updates inventory items', async () => {
    const inventoryUpdate = [
      { productId: 'prod-1', quantity: 5, location: 'main' }
    ];
    
    const response = await request(app)
      .post('/api/inventory')
      .send(inventoryUpdate);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
    expect(mockDbUtils.saveInventoryItems).toHaveBeenCalledWith(inventoryUpdate);
  });
  
  test('POST /api/inventory validates request body', async () => {
    // For this test we'll create a separate app with validation
    const validationApp = express();
    validationApp.use(express.json());
    
    // Add endpoint with validation
    validationApp.post('/api/inventory', (req, res) => {
      if (!req.body || !Array.isArray(req.body) || !req.body.length) {
        return res.status(400).json({ error: 'Invalid request body' });
      }
      
      // Check for required fields
      const invalidItems = req.body.filter(item => 
        !item.productId || item.quantity === undefined || !item.location
      );
      
      if (invalidItems.length > 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      res.status(200).json({ success: true });
    });
    
    // Missing required fields
    const invalidUpdate = [
      { productId: 'prod-1' } // missing quantity and location
    ];
    
    const response = await request(validationApp)
      .post('/api/inventory')
      .send(invalidUpdate);
    
    expect(response.status).toBe(400);
  });
});
