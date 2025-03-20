const request = require('supertest');
const express = require('express');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

// Mock monitoring
jest.mock('../../../utils/monitoring', () => ({
  recordApiUsage: jest.fn(),
  getSystemHealth: jest.fn().mockReturnValue({
    status: 'healthy',
    uptime: 3600,
    memory: {
      used: 100,
      total: 1000
    },
    cpu: 10
  })
}), { virtual: true });

describe('Health API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh Express app
    app = express();
    
    // Import routes
    try {
      const healthRoutes = require('../../../routes/health');
      app.use('/api/health', healthRoutes);
    } catch (error) {
      console.error('Error loading health routes:', error.message);
    }
  });
  
  test('GET /api/health/status returns 200 and health information', async () => {
    // Skip if app wasn't properly set up
    if (!app) {
      console.warn('Skipping test: app not available');
      return;
    }
    
    const response = await request(app).get('/api/health/status');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('healthy');
  });
  
  test('GET /api/health/ping returns 200 and pong', async () => {
    // Skip if app wasn't properly set up
    if (!app) {
      console.warn('Skipping test: app not available');
      return;
    }
    
    const response = await request(app).get('/api/health/ping');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('pong');
  });
});
