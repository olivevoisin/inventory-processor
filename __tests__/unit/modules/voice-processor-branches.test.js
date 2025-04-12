/**
 * Additional tests for voice-processor focusing on branch coverage
 */
const path = require('path');
const voiceProcessor = require('../../../modules/voice-processor');
const database = require('../../../utils/database-utils');

// Properly mock fs module with promises
jest.mock('fs', () => {
  // Create a mock implementation of promises
  const mockPromises = {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock audio data')),
    mkdir: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined)
  };
  
  // Return the full mock object
  return {
    promises: mockPromises,
    createReadStream: jest.fn()
  };
});

// Now we can import fs after mocking it
const fs = require('fs');

jest.mock('../../../utils/database-utils', () => ({
  saveInventoryItems: jest.fn().mockResolvedValue({
    success: true,
    savedCount: 2
  })
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Voice Processor Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processVoiceFile', () => {
    it('should handle file not found errors', async () => {
      fs.promises.readFile.mockRejectedValueOnce(new Error('File not found'));
      
      const result = await voiceProcessor.processVoiceFile('/non-existent.wav', 'kitchen');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should handle directory creation errors', async () => {
      fs.promises.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      
      // Mock readFile to return successfully so we reach the mkdir error
      fs.promises.readFile.mockResolvedValueOnce(Buffer.from('audio data'));
      
      const result = await voiceProcessor.processVoiceFile('/tmp/test.wav', 'kitchen');
      
      // Directory creation error shouldn't fail the whole process
      expect(fs.promises.readFile).toHaveBeenCalled();
    });
    
    it('should handle directory already exists case', async () => {
      // Simulate directory exists error with EEXIST code
      const eexistError = new Error('Directory exists');
      eexistError.code = 'EEXIST';
      fs.promises.mkdir.mockRejectedValueOnce(eexistError);
      
      // This should continue processing despite the directory error
      const result = await voiceProcessor.processVoiceFile('/tmp/test.wav', 'kitchen');
      
      // Should still try to process the file
      expect(fs.promises.readFile).toHaveBeenCalled();
    });
  });

  describe('extractInventoryItems', () => {
    it('should handle empty transcript', async () => {
      const items = await voiceProcessor.extractInventoryItems('');
      expect(items).toEqual([]);
    });
    
    it('should handle transcript with no recognizable items', async () => {
      const items = await voiceProcessor.extractInventoryItems('This is not a valid inventory statement');
      expect(items).toEqual([]);
    });
  });
});
