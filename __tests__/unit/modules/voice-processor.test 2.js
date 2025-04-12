// Test file for voice processor module
const fs = require('fs').promises;
const path = require('path');
const voiceProcessor = require('../modules/voice-processor');
const logger = require('../utils/logger');
const { ExternalServiceError } = require('../utils/error-handler');

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../utils/logger');

// Mock Deepgram
jest.mock('@deepgram/sdk', () => {
  return {
    Deepgram: jest.fn().mockImplementation(() => ({
      transcription: {
        preRecorded: jest.fn().mockReturnValue({
          transcribe: jest.fn().mockResolvedValue({
            results: {
              channels: [{
                alternatives: [{
                  transcript: 'five bottles of wine and three cans of beer',
                  confidence: 0.92
                }]
              }]
            }
          })
        })
      }
    }))
  };
});

describe('Voice Processor Module', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    
    // Set up path.extname mock
    path.extname.mockImplementation(filePath => {
      if (filePath.endsWith('.wav')) return '.wav';
      if (filePath.endsWith('.mp3')) return '.mp3';
      if (filePath.endsWith('.txt')) return '.txt';
      return '';
    });
  });
  
  describe('processVoiceFile', () => {
    test('should process a valid voice file', async () => {
      // Setup
      const filePath = '/tmp/test-audio.wav';
      const location = 'bar';
      fs.readFile.mockResolvedValueOnce(Buffer.from('fake audio data'));
      
      // Execute
      const result = await voiceProcessor.processVoiceFile(filePath, location);
      
      // Verify
      expect(result.success).toBe(true);
      expect(result.transcript).toBeDefined();
      expect(fs.readFile).toHaveBeenCalledWith(filePath);
      expect(logger.info).toHaveBeenCalled();
    });
    
    test('should throw error for unsupported file format', async () => {
      // Setup
      const filePath = '/tmp/some-document.txt';
      
      // Execute
      const result = await voiceProcessor.processVoiceFile(filePath);
      
      // Verify the result contains an error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported voice file format');
    });
  });
  
  describe('extractInventoryData', () => {
    test('should extract inventory data from voice file', async () => {
      // Setup
      const transcript = 'Add 5 units of SKU-123 to shelf A';
      
      // Execute
      const data = await voiceProcessor.extractInventoryData(transcript);
      
      // Verify
      expect(data.success).toBe(true);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].sku).toBe('SKU-123');
    });
  });
  
  describe('transcribeAudio', () => {
    test('should transcribe audio data', async () => {
      // Setup
      const audioData = Buffer.from('fake audio data');
      
      // Execute
      const result = await voiceProcessor.transcribeAudio(audioData);
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.transcript).toBeDefined();
      expect(typeof result.transcript).toBe('string');
      expect(result.transcript).toContain('bottles of wine');
    });
  });
});
