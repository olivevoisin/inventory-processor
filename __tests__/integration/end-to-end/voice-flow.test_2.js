/**
 * End-to-End test for voice workflow
 */
const request = require('supertest');
const app = require('../../../app');
const fs = require('fs');
const path = require('path');

// Mock middleware/common.js - done through a proper module mock rather than EOLcat
jest.mock('../../../middleware/common', () => ({
  trackApiCall: (req, res, next) => next(),
  validateRequest: (fn) => (req, res, next) => next(),
  standardizeResponse: (req, res, next) => next(),
  setupMiddleware: jest.fn()
}));

describe('Voice Recording Workflow', () => {
  test('should process voice recording and update inventory', async () => {
    // Create test audio buffer
    const audioBuffer = Buffer.from('test audio data');
    
    // Step 1: Upload and process voice recording
    const voiceResponse = await request(app)
      .post('/api/voice/process')
      .set('x-api-key', 'test-api-key')
      .attach('audioFile', audioBuffer, 'test.wav')
      .field('location', 'Bar')
      .expect(200);
    
    expect(voiceResponse.body.success).toBe(true);
    expect(voiceResponse.body.transcript).toBeDefined();
    expect(Array.isArray(voiceResponse.body.items)).toBe(true);
    expect(voiceResponse.body.items.length).toBeGreaterThan(0);
    
    // Step 2: Get inventory to see if it was updated
    const inventoryResponse = await request(app)
      .get('/api/inventory')
      .set('x-api-key', 'test-api-key')
      .query({ location: 'Bar' })
      .expect(200);
    
    expect(Array.isArray(inventoryResponse.body)).toBe(true);
  });
  
  test('should handle errors in voice processing', async () => {
    // Create test audio buffer
    const audioBuffer = Buffer.from('invalid audio data');
    
    // Step 1: Upload and process voice recording with bad data
    const voiceResponse = await request(app)
      .post('/api/voice/process')
      .set('x-api-key', 'test-api-key')
      .attach('audioFile', audioBuffer, 'bad.xyz')
      .field('location', 'Bar')
      .expect(500);
    
    expect(voiceResponse.body.success).toBe(false);
    expect(voiceResponse.body.error).toBeDefined();
  });
});
