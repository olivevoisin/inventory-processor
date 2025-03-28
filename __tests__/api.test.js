/**
 * API integration tests
 */

const request = require('supertest');
const app = require('../app');

describe('API Routes', () => {
  describe('Voice API', () => {
    it('GET /api/voice/status/:id should return status', async () => {
      const response = await request(app)
        .get('/api/voice/status/123')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('123');
    });
  });
  
  describe('Invoice API', () => {
    it('GET /api/invoice/status/:id should return status', async () => {
      const response = await request(app)
        .get('/api/invoice/status/456')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('456');
    });
  });
  
  describe('Inventory API', () => {
    it('GET /api/inventory should return inventory items', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    it('GET /api/inventory/:id should return a specific item', async () => {
      const response = await request(app)
        .get('/api/inventory/789')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('789');
    });
    
    it('POST /api/inventory should create a new item', async () => {
      const itemData = {
        productId: 'PROD-TEST',
        name: 'Test Product',
        quantity: 5,
        location: 'Test Location'
      };
      
      const response = await request(app)
        .post('/api/inventory')
        .send(itemData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.productId).toBe(itemData.productId);
      expect(response.body.data.name).toBe(itemData.name);
      expect(response.body.data.quantity).toBe(itemData.quantity);
    });
  });
  
  describe('i18n API', () => {
    it('GET /api/i18n/translations should return translations', async () => {
      const response = await request(app)
        .get('/api/i18n/translations?lang=en')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.translations).toBeDefined();
      expect(typeof response.body.translations).toBe('object');
    });
    
    it('GET /api/i18n/languages should return available languages', async () => {
      const response = await request(app)
        .get('/api/i18n/languages')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.languages)).toBe(true);
      expect(response.body.languages).toContain('en');
      expect(response.body.languages).toContain('fr');
    });
  });
});
