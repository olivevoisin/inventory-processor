// Mock Deepgram
jest.mock('deepgram', () => ({
    Deepgram: jest.fn().mockImplementation(() => ({
      transcription: {
        preRecorded: jest.fn().mockImplementation(() => ({
          transcribe: jest.fn().mockResolvedValue({
            results: {
              channels: [{
                alternatives: [{
                  transcript: "five bottles of wine and three cans of beer",
                  confidence: 0.95
                }]
              }]
            }
          })
        }))
      }
    }))
  }));
  
  // Mock database-utils for product matching
  jest.mock('../../../utils/database-utils', () => ({
    findProductByName: jest.fn().mockImplementation((name) => {
      const products = {
        'wine': { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 },
        'beer': { id: 'prod-2', name: 'Beer', unit: 'can', price: 5 }
      };
      return Promise.resolve(products[name.toLowerCase()] || null);
    }),
    getProducts: jest.fn().mockResolvedValue([
      { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 },
      { id: 'prod-2', name: 'Beer', unit: 'can', price: 5 }
    ])
  }), { virtual: true });
  
  // Mock fs
  jest.mock('fs', () => ({
    promises: {
      readFile: jest.fn().mockResolvedValue(Buffer.from('audio data'))
    },
    createReadStream: jest.fn().mockReturnValue({
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn((event, callback) => {
        if (event === 'end') callback();
        return this;
      })
    })
  }));
  
  describe('Voice Processor Module', () => {
    let voiceProcessor;
    
    beforeEach(() => {
      jest.resetModules();
      voiceProcessor = require('../../../modules/voice-processor');
    });
    
    test('should transcribe audio correctly', async () => {
      const result = await voiceProcessor.transcribeAudio('test-audio.wav');
      
      expect(result).toBeDefined();
      expect(result.transcript).toBe('five bottles of wine and three cans of beer');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
    
    test('should extract inventory items from transcript', async () => {
      const transcript = 'five bottles of wine and three cans of beer';
      const result = await voiceProcessor.extractInventoryItems(transcript);
      
      expect(result).toHaveLength(2);
      
      // Check first item (wine)
      expect(result[0].name).toBe('Wine');
      expect(result[0].quantity).toBe(5);
      expect(result[0].unit).toBe('bottle');
      
      // Check second item (beer)
      expect(result[1].name).toBe('Beer');
      expect(result[1].quantity).toBe(3);
      expect(result[1].unit).toBe('can');
    });
    
    test('should process voice file end-to-end', async () => {
      const result = await voiceProcessor.processVoiceFile('test-audio.wav');
      
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.transcript).toBe('five bottles of wine and three cans of beer');
    });
    
    test('should handle transcription failure', async () => {
      // Override the mock for this test
      const deepgramMock = require('deepgram');
      deepgramMock.Deepgram.mockImplementationOnce(() => ({
        transcription: {
          preRecorded: jest.fn().mockImplementation(() => ({
            transcribe: jest.fn().mockRejectedValue(new Error('Transcription failed'))
          }))
        }
      }));
      
      await expect(voiceProcessor.transcribeAudio('test-audio.wav'))
        .rejects.toThrow('Transcription failed');
    });
  });