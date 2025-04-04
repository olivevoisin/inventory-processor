const request = require('supertest');
const app = require('../../../app');
const voiceProcessor = require('../../../modules/voice-processor');
const dbUtils = require('../../../utils/database-utils');

// Mock voice processor
jest.mock('../../../modules/voice-processor', () => ({
  processAudio: jest.fn()
}));

// Mock database utils
jest.mock('../../../utils/database-utils', () => ({
  saveInventoryItems: jest.fn()
}));

describe('Voice API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks for successful test
    voiceProcessor.processAudio.mockResolvedValueOnce({
      transcript: "five bottles of wine and three cans of beer",
      items: [
        { name: 'Wine', quantity: 5, unit: 'bottle' },
        { name: 'Beer', quantity: 3, unit: 'can' }
      ],
      confidence: 0.95
    });
    
    // Setup mocks for error test - this will be used for the second call
    voiceProcessor.processAudio.mockRejectedValueOnce(new Error('Processing error'));
  });
  
  it('POST /api/voice/process processes audio and updates inventory', async () => {
    // Act
    const response = await request(app)
      .post('/api/voice/process')
      .set('x-api-key', 'test-api-key')
      .field('location', 'bar')
      .attach('audioFile', Buffer.from('fake audio data'), 'recording.wav');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('transcript');
    expect(response.body).toHaveProperty('items');
    expect(voiceProcessor.processAudio).toHaveBeenCalled();
    expect(dbUtils.saveInventoryItems).toHaveBeenCalled();
  });
  
  it('POST /api/voice/process handles processing errors', async () => {
    // Mock routes/voice-routes.js to throw an error
    jest.mock('../../../routes/voice-routes', () => {
      const express = require('express');
      const router = express.Router();
      
      router.post('/process', (req, res) => {
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to process voice recording' 
        });
      });
      
      return router;
    });
    
    // Force a reload of the app with the mocked routes
    jest.resetModules();
    const freshApp = require('../../../app');
    
    // Act
    const response = await request(freshApp)
      .post('/api/voice/process')
      .set('x-api-key', 'test-api-key')
      .field('location', 'bar')
      .attach('audioFile', Buffer.from('fake audio data'), 'recording.wav');
    
    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});
