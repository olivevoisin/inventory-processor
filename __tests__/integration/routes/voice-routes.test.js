/**
 * Voice Routes Tests
 */
const request = require('supertest');
const app = require('../../app');
const voiceProcessor = require('../../modules/voice-processor');

// Mock voiceProcessor
jest.mock('../../modules/voice-processor');

describe('Voice Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementation
    voiceProcessor.processAudio.mockResolvedValue({
      transcript: 'five bottles of wine',
      confidence: 0.95,
      items: [
        { name: 'Wine', quantity: 5, unit: 'bottle' }
      ]
    });
  });
  
  describe('POST /api/voice/process', () => {
    const formData = {
      location: 'Bar'
    };
    
    it('should process voice file and return results', async () => {
      await request(app)
        .post('/api/voice/process')
        .set('x-api-key', 'test-api-key')
        .attach('audioFile', Buffer.from('test audio data'), 'test.wav')
        .field('location', formData.location)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body).toHaveProperty('transcript');
          expect(res.body).toHaveProperty('items');
        });
      
      // Verify
      expect(voiceProcessor.processAudio).toHaveBeenCalledTimes(1);
    });
    
    it('should return 400 when no audio file is provided', async () => {
      await request(app)
        .post('/api/voice/process')
        .set('x-api-key', 'test-api-key')
        .field('location', formData.location)
        .expect(400);
    });
    
    it('should return 401 when no API key is provided', async () => {
      await request(app)
        .post('/api/voice/process')
        .attach('audioFile', Buffer.from('test audio data'), 'test.wav')
        .field('location', formData.location)
        .expect(401);
    });
  });
});
