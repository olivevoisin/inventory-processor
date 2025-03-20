// Simplified test that just checks if modules export expected functions
describe('Module Exports Check', () => {
  
  test('Voice processor exports', () => {
    jest.mock('../../utils/logger', () => ({
      info: jest.fn(),
      error: jest.fn()
    }));
    
    const voiceProcessor = jest.requireActual('../../modules/voice-processor');
    
    expect(voiceProcessor).toBeDefined();
    // Just check if properties exist, don't call them
    expect(voiceProcessor).toHaveProperty('processVoiceFile');
    expect(voiceProcessor).toHaveProperty('extractInventoryData');
  });
  
  test('Error handler exports', () => {
    const errorHandler = jest.requireActual('../../utils/error-handler');
    
    expect(errorHandler).toBeDefined();
    expect(errorHandler).toHaveProperty('ValidationError');
    expect(errorHandler).toHaveProperty('DatabaseError');
  });
});
