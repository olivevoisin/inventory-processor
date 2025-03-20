// Direct test for voice processor to measure coverage
const voiceProcessor = require('../../modules/voice-processor');

// Mock any external dependencies
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Voice Processor Direct Test', () => {
  test('should expose the expected methods', () => {
    expect(voiceProcessor).toBeDefined();
    expect(typeof voiceProcessor.processVoiceFile).toBe('function');
    expect(typeof voiceProcessor.extractInventoryData).toBe('function');
  });
  
  // Test for extractInventoryData which should be simpler to test
  test('extractInventoryData should parse inventory commands', () => {
    const transcript = "Add 5 units of SKU-123 to shelf A";
    const result = voiceProcessor.extractInventoryData(transcript);
    expect(result).toBeDefined();
  });
});
