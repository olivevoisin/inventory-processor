/**
 * Tests for the voice processor module
 */
const fs = require('fs');
const { 
  processVoiceFile, 
  extractInventoryData, 
  transcribeAudio 
} = require('../modules/voice-processor');

// Mock fs.promises.readFile
jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    promises: {
      ...original.promises,
      readFile: jest.fn()
    }
  };
});

describe('Voice Processor Module', () => {
  describe('processVoiceFile', () => {
    it('should process a valid voice file', async () => {
      // Mock audio data
      fs.promises.readFile.mockResolvedValue(Buffer.from('test audio data'));
      
      // Set up test file path
      const filePath = 'recording.wav';
      
      // Call the function
      const result = await processVoiceFile(filePath);
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transcript).toBeDefined();
      expect(result.items).toBeDefined();
    });
    
    it('should throw error for unsupported file format', async () => {
      // Mock audio data
      fs.promises.readFile.mockResolvedValue(Buffer.from('test audio data'));
      
      // Set up test file path with unsupported extension
      const filePath = 'recording.xyz';
      
      // Expect the function to throw
      await expect(processVoiceFile(filePath)).rejects.toThrow('Unsupported voice file format');
    });
  });
  
  describe('extractInventoryData', () => {
    it('should extract inventory data from voice file', async () => {
      
      // Call the function
      const result = await extractInventoryData("Add 5 units of SKU-123 to shelf A");
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.command).toBe('add');
      expect(result.quantity).toBe(5);
      expect(result.sku).toBe('SKU-123');
      expect(result.location).toBe('shelf A');
    });
  });
  
  describe('transcribeAudio', () => {
    it('should transcribe audio data', async () => {
      // Set up test file path
      const filePath = 'test-audio.wav';
      
      // Call the function
      const result = await transcribeAudio(filePath);
      
      // Assertions
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('bottles of wine');
    });
  });
});
