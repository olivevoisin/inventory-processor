const fs = require('fs');
const { Deepgram } = require('@deepgram/sdk');
const logger = require('../../../utils/logger');
const databaseUtils = require('../../../utils/database-utils');
const { ExternalServiceError } = require('../../../utils/error-handler');
const voiceProcessor = require('../../../modules/voice-processor');

// Mock external dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock audio content')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined)
  },
  existsSync: jest.fn().mockReturnValue(true)
}));

jest.mock('@deepgram/sdk', () => {
  const mockTranscribeFn = jest.fn().mockResolvedValue({
    results: {
      channels: [{
        alternatives: [{
          transcript: "five bottles of wine and three cans of beer",
          confidence: 0.95
        }]
      }]
    }
  });
  
  return {
    Deepgram: jest.fn().mockImplementation(() => ({
      transcription: {
        preRecorded: jest.fn().mockImplementation(() => ({
          transcribe: mockTranscribeFn
        }))
      }
    }))
  };
});

jest.mock('../../../utils/database-utils', () => ({
  findProductByName: jest.fn().mockImplementation((name) => {
    if (name === 'wine') {
      return Promise.resolve({ id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 });
    } else if (name === 'beer') {
      return Promise.resolve({ id: 'prod-2', name: 'Beer', unit: 'can', price: 5 });
    }
    return Promise.resolve(null);
  }),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true })
}));

describe('Voice Processor Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set test mode if the function exists
    if (typeof voiceProcessor.setTestMode === 'function') {
      voiceProcessor.setTestMode(true);
    }
  });
  
  describe('Basic Functionality', () => {
    test('should process audio file correctly', async () => {
      const result = await voiceProcessor.processVoiceFile('test-audio.wav');
      
      expect(result.success).toBe(true);
      expect(result.transcript).toBe('five bottles of wine and three cans of beer');
      expect(result.items).toHaveLength(2);
    });
    
    test('should transcribe audio correctly', async () => {
      const result = await voiceProcessor.transcribeAudio('test-audio.wav');
      
      if (typeof result === 'string') {
        expect(result).toBe('five bottles of wine and three cans of beer');
      } else {
        expect(result).toBeDefined();
        expect(result.transcript).toBe('five bottles of wine and three cans of beer');
        expect(result.confidence).toBeGreaterThan(0.9);
      }
    });
    
    test('should extract inventory items from transcript', async () => {
      const result = await voiceProcessor.extractInventoryItems('five bottles of wine and three cans of beer');
      
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
  });
  
  describe('Error Handling', () => {
    test('should handle transcription failure', async () => {
      // If the module has a setShouldFail function, use it
      if (typeof voiceProcessor.setShouldFail === 'function') {
        voiceProcessor.setShouldFail(true);
      }
      
      // Otherwise mock the transcription to fail
      const Deepgram = require('@deepgram/sdk').Deepgram;
      const deepgramInstance = Deepgram();
      deepgramInstance.transcription.preRecorded().transcribe.mockRejectedValueOnce(new Error('Transcription failed'));
      
      try {
        await voiceProcessor.transcribeAudio('fail-transcription');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Transcription failed');
      }
      
      // Reset the fail mode if needed
      if (typeof voiceProcessor.setShouldFail === 'function') {
        voiceProcessor.setShouldFail(false);
      }
    });
  });
});
