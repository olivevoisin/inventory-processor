/**
 * Additional tests for inventory routes to improve coverage
 */
const request = require('supertest');
const express = require('express');
const inventoryRoutes = require('../../../routes/inventory');
const database = require('../../../utils/database-utils');

// Mock dependencies
jest.mock('../../../utils/database-utils', () => ({
  getProducts: jest.fn(),
  getInventoryByLocation: jest.fn(),
  saveInventoryItems: jest.fn()
}));

jest.mock('../../../middleware/auth', () => ({
  authenticateApiKey: (req, res, next) => next() // Skip authentication for testing
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Create an Express app for testing
const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);

describe('Inventory Routes - Additional Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/inventory/products', () => {
    test('should handle errors from database.getProducts', async () => {
      // Mock getProducts to throw an error
      database.getProducts.mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/inventory/products');
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Error getting products');
    });
  });

  describe('GET /api/inventory', () => {
    test('should handle errors from database.getInventoryByLocation', async () => {
      // Mock getInventoryByLocation to throw an error
      database.getInventoryByLocation.mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/inventory')
        .query({ location: 'Bar' });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Error getting inventory');
    });
  });

  describe('POST /api/inventory', () => {
    test('should handle database error when saving inventory items', async () => {
      // Mock saveInventoryItems to throw an error
      database.saveInventoryItems.mockRejectedValueOnce(new Error('Database error'));
      
      const items = [
        { productId: 'prod-1', quantity: 10 }
      ];
      
      const response = await request(app)
        .post('/api/inventory')
        .send(items);
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Error saving inventory items');
    });
  });
});
