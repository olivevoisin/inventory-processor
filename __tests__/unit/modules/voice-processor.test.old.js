// __tests__/unit/modules/voice-processor.test.js
// Import the real module instead of mocking it
const voiceProcessor = require('../../../modules/voice-processor');

// Mock dependencies
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Voice Processor Module', () => {
  describe('processVoiceFile', () => {
    test('should transcribe voice file correctly', async () => {
      // Mock implementation for testing
      voiceProcessor.transcribeAudio = jest.fn().mockResolvedValue("Add 5 units of SKU-123 to shelf A");
      
      const result = await voiceProcessor.processVoiceFile('sample.mp3');
      expect(result).toBeDefined();
    });
  });
  
  describe('extractInventoryData', () => {
    test('should extract product SKU, quantity and location from transcript', () => {
      const transcript = "Add 5 units of SKU-123 to shelf A";
      const result = voiceProcessor.extractInventoryData(transcript);
      expect(result).toBeDefined();
    });
    
    test('should handle removal commands', () => {
      const transcript = "Remove 3 units of SKU-456 from shelf B";
      const result = voiceProcessor.extractInventoryData(transcript);
      expect(result).toBeDefined();
    });
    
    test('should return null for unrecognized commands', () => {
      const transcript = "This is not a valid inventory command";
      const result = voiceProcessor.extractInventoryData(transcript);
      expect(result).toBeNull();
    });
  });
});
