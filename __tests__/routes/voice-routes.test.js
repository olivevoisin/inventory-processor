/**
 * Voice Routes Tests
 */
const request = require('supertest');
const app = require('../../app');
const voiceProcessor = require('../../modules/voice-processor');

// Mock the voice processor module
jest.mock('../../modules/voice-processor', () => ({
  processAudio: jest.fn().mockResolvedValue({
    transcript: 'five bottles of wine',
    confidence: 0.95,
    items: [
      { name: 'Wine', quantity: 5, unit: 'bottle' }
    ]
  }),
  processVoiceFile: jest.fn().mockResolvedValue({
    transcript: 'five bottles of wine',
    items: [
      { name: 'Wine', quantity: 5, unit: 'bottle' }
    ]
  })
}));

// Set up test environment
process.env.SKIP_AUTH = 'true'; // Skip authentication for tests
process.env.NODE_ENV = 'test'; // Ensure we're in test mode

describe('Voice Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/voice/process', () => {
    const formData = {
      location: 'Bar'
    };
    
    it('should process voice file and return results', async () => {
      // Use supertest to test the route
      const response = await request(app)
        .post('/api/voice/process')
        .set('x-api-key', 'test-api-key')
        .attach('audioFile', Buffer.from('test audio data'), 'test.wav')
        .field('location', formData.location);
      
      // Check response status
      expect(response.status).toBe(200);
      
      // Check response body
      expect(response.body.success).toBe(true);
      
      // Verify processAudio was called
      expect(voiceProcessor.processAudio).toHaveBeenCalledTimes(1);
    });
    
    it('should return 400 when no audio file is provided', async () => {
      const response = await request(app)
        .post('/api/voice/process')
        .set('x-api-key', 'test-api-key')
        .field('location', formData.location);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 401 when no API key is provided', async () => {
      // For this test we need to temporarily disable SKIP_AUTH
      process.env.SKIP_AUTH = 'false';
      
      const response = await request(app)
        .post('/api/voice/process')
        .attach('audioFile', Buffer.from('test audio data'), 'test.wav')
        .field('location', formData.location);
      
      expect(response.status).toBe(401);
      
      // Restore SKIP_AUTH
      process.env.SKIP_AUTH = 'true';
    });
  });
});
