/**
 * Tests for the voice processor module
 */

const path = require('path');
const { processVoiceFile, extractInventoryData } = require('../modules/voice-processor');

// Mock file system
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true)
}));

describe('Voice Processor Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('processVoiceFile', () => {
    it('should process a valid voice file', async () => {
      // Setup test file path
      const filePath = path.join(__dirname, 'fixtures', 'test-voice.mp3');
      
      // Call the function
      const result = await processVoiceFile(filePath);
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.recordedBy).toBe('voice-system');
    });
    
    it('should throw error for unsupported file format', async () => {
      // Setup test file path with unsupported extension
      const filePath = path.join(__dirname, 'fixtures', 'test-voice.txt');
      
      // Expect the function to throw
      await expect(processVoiceFile(filePath)).rejects.toThrow('Unsupported voice file format');
    });
  });
  
  describe('extractInventoryData', () => {
    it('should extract inventory data from voice file', async () => {
      // Setup test file path
      const filePath = path.join(__dirname, 'fixtures', 'test-voice.mp3');
      
      // Call the function
      const result = await extractInventoryData(filePath);
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBe(2); // Based on mock implementation
      expect(result.items[0].productId).toContain('PROD-');
      expect(result.items[0].quantity).toBeDefined();
      expect(result.items[0].location).toBeDefined();
    });
  });
});
