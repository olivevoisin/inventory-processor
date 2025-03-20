const request = require('supertest');
const express = require('express');
const path = require('path');

// Mock multer
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      req.file = {
        path: 'uploads/voice/recording.wav',
        filename: 'recording.wav'
      };
      next();
    }
  });
  multer.diskStorage = jest.fn();
  return multer;
});

// Mock the voice processor
jest.mock('../../../modules/voice-processor', () => ({
  processAudio: jest.fn().mockResolvedValue({
    transcript: 'five bottles of wine',
    confidence: 0.95,
    items: [
      { id: 'prod-1', name: 'Wine', quantity: 5, unit: 'bottle' }
    ]
  })
}), { virtual: true });

// Mock the database utils
jest.mock('../../../utils/database-utils', () => ({
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

describe('Voice API Endpoints', () => {
  let app;
  let voiceProcessor;
  let dbUtils;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Load mocked modules
    voiceProcessor = require('../../../modules/voice-processor');
    dbUtils = require('../../../utils/database-utils');
    
    // Create a fresh Express app
    app = express();
    
    // Add JSON parsing middleware
    app.use(express.json());
    
    // Import routes
    try {
      const voiceRoutes = require('../../../routes/voice-routes');
      app.use('/api/voice', voiceRoutes);
    } catch (error) {
      console.error('Error loading voice routes:', error.message);
    }
  });
  
  test('POST /api/voice/process processes audio and updates inventory', async () => {
    // Skip if app wasn't properly set up
    if (!app) {
      console.warn('Skipping test: app not available');
      return;
    }
    
    const response = await request(app)
      .post('/api/voice/process')
      .attach('audioFile', Buffer.from('fake audio data'), 'recording.wav');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('transcript');
    expect(response.body).toHaveProperty('items');
    expect(voiceProcessor.processAudio).toHaveBeenCalled();
    expect(dbUtils.saveInventoryItems).toHaveBeenCalled();
  });
  
  test('POST /api/voice/process handles processing errors', async () => {
    // Skip if app wasn't properly set up
    if (!app) {
      console.warn('Skipping test: app not available');
      return;
    }
    
    // Set up mock to throw an error
    voiceProcessor.processAudio.mockRejectedValueOnce(new Error('Processing error'));
    
    const response = await request(app)
      .post('/api/voice/process')
      .attach('audioFile', Buffer.from('fake audio data'), 'recording.wav');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});
