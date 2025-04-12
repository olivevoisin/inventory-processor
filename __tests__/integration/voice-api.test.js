const request = require('supertest');
const app = require('../../app');
const voiceProcessor = require('../../modules/voice-processor');

// Mock the voice processor
jest.mock('../../modules/voice-processor');

// Mock the database utils
jest.mock('../../utils/database-utils', () => ({
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true }),
  findProductByName: jest.fn().mockImplementation((name) => {
    if (name.includes('wine')) {
      return { id: 1, name: 'Wine', unit: 'bottle' };
    }
    if (name.includes('beer')) {
      return { id: 2, name: 'Beer', unit: 'can' };
    }
    return null;
  })
}));

// Mock the authentication middleware to bypass auth for tests
jest.mock('../../middleware/auth', () => ({
  authenticateApiKey: (req, res, next) => next(),
  verifyToken: (req, res, next) => next(),
  generateToken: jest.fn().mockReturnValue('mock-token')
}));

describe('API de traitement vocal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mocked responses
    voiceProcessor.processAudio.mockResolvedValue({
      transcript: "cinq bouteilles de vin et trois cannettes de bière",
      items: [
        { name: 'Wine', quantity: 5, unit: 'bottle' },
        { name: 'Beer', quantity: 3, unit: 'can' }
      ],
      confidence: 0.95
    });
  });
  
  it('POST /api/voice/process devrait traiter un fichier audio', async () => {
    // Arrange
    const formData = {
      location: 'bar'
    };
    
    // Act
    const response = await request(app)
      .post('/api/voice/process')
      .set('x-api-key', 'test-api-key')
      .attach('audioFile', Buffer.from('test audio data'), 'test.wav')
      .field('location', formData.location);
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.items).toHaveLength(2);
    expect(voiceProcessor.processAudio).toHaveBeenCalled();
  });
});