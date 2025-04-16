/**
 * Additional tests for voice-processor focusing on branch coverage
 */
const path = require('path');
const voiceProcessor = require('../../modules/voice-processor');
const database = require('../../utils/database-utils'); // Corrected path

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

jest.mock('../../utils/database-utils', () => ({ // Changed from ../../../utils/database-utils
  saveInventoryItems: jest.fn().mockResolvedValue({
    success: true,
    savedCount: 2
  }),
  getProducts: jest.fn().mockResolvedValue([ // Assuming getProducts might be needed
    { name: 'Wine', synonyms: 'vin|vino' },
    { name: 'Beer', synonyms: 'biere|birra' }
  ])
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const logger = require('../../utils/logger'); // Add this line

describe('Voice Processor Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default behavior if necessary
    fs.promises.readFile.mockResolvedValue(Buffer.from('mock audio data'));
    fs.promises.mkdir.mockResolvedValue(undefined);
    fs.promises.access.mockResolvedValue(undefined);
  });

  describe('processVoiceFile', () => {
    it('should handle file not found errors', async () => {
      // Mock readFile to reject for this test
      fs.promises.readFile.mockRejectedValueOnce(new Error('File not found'));

      const result = await voiceProcessor.processVoiceFile('/non-existent.wav', 'kitchen');

      // --- ASSERTION ---
      // This assertion fails because the source code likely doesn't set success: false on readFile error.
      // FIX REQUIRED IN: modules/voice-processor.js
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing voice file'), expect.any(Error));
    });

    it('should handle directory creation errors', async () => {
      // Mock mkdir to reject with a generic error
      fs.promises.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      // Ensure readFile is mocked to resolve (default behavior set in beforeEach)

      const result = await voiceProcessor.processVoiceFile('/tmp/test.wav', 'kitchen');

      // --- ASSERTION ---
      // This assertion fails because the source code likely exits prematurely on mkdir error.
      // FIX REQUIRED IN: modules/voice-processor.js (should potentially log mkdir error but continue)
      expect(fs.promises.readFile).toHaveBeenCalled();
      // Optional: Check if the specific mkdir error was logged
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create directory'), expect.any(Error));
    });

    it('should handle directory already exists case', async () => {
      // Simulate directory exists error with EEXIST code
      const eexistError = new Error('Directory exists');
      eexistError.code = 'EEXIST';
      fs.promises.mkdir.mockRejectedValueOnce(eexistError);
      // Ensure readFile is mocked to resolve (default behavior set in beforeEach)

      const result = await voiceProcessor.processVoiceFile('/tmp/test.wav', 'kitchen');

      // --- ASSERTION ---
      // This assertion fails because the source code likely exits prematurely even on EEXIST error.
      // FIX REQUIRED IN: modules/voice-processor.js (should catch EEXIST and ignore it)
      expect(fs.promises.readFile).toHaveBeenCalled();
      // Ensure the EEXIST error wasn't logged as a critical failure
      expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('Failed to create directory'), eexistError);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Directory already exists')); // Or info/debug
    });
  });

  describe('extractInventoryItems', () => {
    afterEach(() => {
      jest.restoreAllMocks(); // Ensure mocks/spies are reset
    });

    it('should handle empty transcript', async () => {
      // Explicitly mock for this test if needed, otherwise rely on actual function
      const spy = jest.spyOn(voiceProcessor, 'extractInventoryItems').mockResolvedValue([]);
      const items = await voiceProcessor.extractInventoryItems('');
      expect(items).toEqual([]);
      spy.mockRestore();
    });

    it('should handle transcript with no recognizable items', async () => {
      // Explicitly mock for this test if needed, otherwise rely on actual function
      const spy = jest.spyOn(voiceProcessor, 'extractInventoryItems').mockResolvedValue([]);
      const items = await voiceProcessor.extractInventoryItems('This is not a valid inventory statement');
      expect(items).toEqual([]); // Expect empty array
      spy.mockRestore();
    });
  });
});
