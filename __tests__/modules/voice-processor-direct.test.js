/**
 * Direct tests for voice-processor module
 * Without using Jest mocks
 */
const voiceProcessor = require('../../modules/voice-processor');

describe('Voice Processor Direct Test', () => {
  test('should expose the expected methods', () => {
    expect(voiceProcessor).toBeDefined();
    expect(typeof voiceProcessor.processVoiceFile).toBe('function');
    expect(typeof voiceProcessor.extractInventoryData).toBe('function');
  });
  
  test('extractInventoryData should parse inventory commands', () => {
    const transcript = "Add 5 units of SKU-123 to shelf A";
    const result = voiceProcessor.extractInventoryData(transcript);
    expect(result).toBeDefined();
  });
});
