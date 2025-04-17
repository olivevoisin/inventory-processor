/**
 * Tests for voice-routes.js with enhanced coverage
 * @jest-environment node
 */

const request = require('supertest');
const app = require('../../app');

// Properly mock dependencies
jest.mock('../../modules/voice-processor');
const voiceProcessor = require('../../modules/voice-processor');

describe('Voice Routes - Enhanced Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementation
    voiceProcessor.processVoiceFile.mockImplementation(() => ({
      success: true,
      transcript: 'mocked transcript',
      confidence: 0.95
    }));
  });
  
  test('POST /api/voice/process should process and save voice data', async () => {
    const response = await request(app)
      .post('/api/voice/process')
      .field('location', 'test-location')
      .attach('audioFile', Buffer.from('mock audio content'), 'audio.wav');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.transcript).toBeDefined();
    expect(voiceProcessor.processVoiceFile).toHaveBeenCalled();
  });
  
  test('POST /api/voice/process should return error if no audio file is provided', async () => {
    const response = await request(app)
      .post('/api/voice/process')
      .field('location', 'test-location');
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('No audio file provided');
  });
  
  test('POST /api/voice/process should handle saving to inventory when specified', async () => {
    const response = await request(app)
      .post('/api/voice/process')
      .field('location', 'test-location')
      .field('saveToInventory', 'true')
      .attach('audioFile', Buffer.from('mock audio content'), 'audio.wav');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.transcript).toBeDefined();
    expect(voiceProcessor.processVoiceFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        saveToInventory: true
      })
    );
  });
  
  test('POST /api/voice/process should not save to inventory when saveToInventory=false', async () => {
    const response = await request(app)
      .post('/api/voice/process')
      .field('location', 'test-location')
      .field('saveToInventory', 'false')
      .attach('audioFile', Buffer.from('mock audio content'), 'audio.wav');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(voiceProcessor.processVoiceFile).toHaveBeenCalled();
    expect(voiceProcessor.processVoiceFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        saveToInventory: false
      })
    );
  });
});