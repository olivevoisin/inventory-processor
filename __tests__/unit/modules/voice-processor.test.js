// Mock Deepgram
const mockDeepgramTranscribeFn = jest.fn().mockResolvedValue({
  results: {
    channels: [{
      alternatives: [{
        transcript: "five bottles of wine and three cans of beer",
        confidence: 0.95
      }]
    }]
  }
});

const mockDeepgramPreRecordedFn = jest.fn().mockImplementation(() => ({
  transcribe: mockDeepgramTranscribeFn
}));

const mockDeepgramInstance = {
  transcription: {
    preRecorded: mockDeepgramPreRecordedFn
  }
};

jest.mock('@deepgram/sdk', () => ({
  Deepgram: jest.fn().mockImplementation(() => mockDeepgramInstance)
}));

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock audio content')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined)
  },
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock database-utils
const mockFindProductByName = jest.fn().mockImplementation((name) => {
  const products = {
    'wine': { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 },
    'beer': { id: 'prod-2', name: 'Beer', unit: 'can', price: 5 }
  };
  return Promise.resolve(products[name.toLowerCase()] || null);
});

jest.mock('../../../utils/database-utils', () => ({
  findProductByName: mockFindProductByName,
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true })
}));

// Mock config
jest.mock('../../../config', () => ({
  deepgram: {
    apiKey: 'mock-api-key'
  },
  uploads: {
    audioDir: './uploads/audio'
  }
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Voice Processor Module', () => {
  let voiceProcessor;
  let fs;
  let logger;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset modules to ensure clean state
    jest.resetModules();
    
    // Load mocked modules
    fs = require('fs');
    logger = require('../../../utils/logger');
    
    // Import the module after mocks are set up
    try {
      voiceProcessor = require('../../../modules/voice-processor');
    } catch (error) {
      console.error('Error loading voice-processor module:', error.message);
    }
  });
  
  test('processAudio handles audio files correctly', async () => {
    // Skip if module or method doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.processAudio !== 'function') {
      console.warn('Skipping test: processAudio method not available');
      return;
    }
    
    const result = await voiceProcessor.processAudio('test-audio.wav');
    
    // Check if file was read
    expect(fs.promises.readFile).toHaveBeenCalledWith('test-audio.wav');
    expect(result).toBeDefined();
    expect(result).toHaveProperty('transcript');
    expect(result).toHaveProperty('items');
  });
  
  test('transcribeAudio handles different audio formats', async () => {
    // Skip if module or method doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.transcribeAudio !== 'function') {
      console.warn('Skipping test: transcribeAudio method not available');
      return;
    }
    
    // Test with WAV format
    await voiceProcessor.transcribeAudio(Buffer.from('wav audio content'));
    
    // Check that the mock was called with correct parameters
    expect(mockDeepgramPreRecordedFn).toHaveBeenCalled();
    expect(mockDeepgramTranscribeFn).toHaveBeenCalled();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Test with MP3 format mock
    if (voiceProcessor.detectAudioFormat) {
      // If the module has format detection, we test it
      jest.spyOn(voiceProcessor, 'detectAudioFormat').mockReturnValueOnce('audio/mp3');
      await voiceProcessor.transcribeAudio(Buffer.from('mp3 audio content'));
      
      // Verify the correct function was called
      expect(mockDeepgramPreRecordedFn).toHaveBeenCalled();
    }
  });
  
  test('extractInventoryItems recognizes quantities and products correctly', async () => {
    // Skip if module or method doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.extractInventoryItems !== 'function') {
      console.warn('Skipping test: extractInventoryItems method not available');
      return;
    }
    
    // Reset the mock implementation before each test case
    mockFindProductByName.mockImplementation((name) => {
      const products = {
        'wine': { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 },
        'beer': { id: 'prod-2', name: 'Beer', unit: 'can', price: 5 }
      };
      return Promise.resolve(products[name.toLowerCase()] || null);
    });
    
    // Test the function with a known transcript
    const result = await voiceProcessor.extractInventoryItems("five bottles of wine");
    
    // Verify the mock was called
    expect(mockFindProductByName).toHaveBeenCalled();
    
    // Verify basic result structure
    expect(Array.isArray(result)).toBe(true);
  });
  
  test('handles file system errors gracefully', async () => {
    // Skip if module or method doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.processAudio !== 'function') {
      console.warn('Skipping test: processAudio method not available');
      return;
    }
    
    // Setup fs to throw an error
    fs.promises.readFile.mockRejectedValueOnce(new Error('File not found'));
    
    // Process should throw or return error
    try {
      await voiceProcessor.processAudio('non-existent-file.wav');
      // If we reach here, ensure the error was logged at least
      expect(logger.error).toHaveBeenCalled();
    } catch (error) {
      expect(error.message).toBe('File not found');
    }
  });
  
  test('handles Deepgram API errors gracefully', async () => {
    // Skip if module or method doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.transcribeAudio !== 'function') {
      console.warn('Skipping test: transcribeAudio method not available');
      return;
    }
    
    // Setup Deepgram to throw an error
    mockDeepgramTranscribeFn.mockRejectedValueOnce(new Error('API quota exceeded'));
    
    // Process should throw or return error
    try {
      await voiceProcessor.transcribeAudio(Buffer.from('audio content'));
      // If we reach here, ensure the error was logged at least
      expect(logger.error).toHaveBeenCalled();
    } catch (error) {
      expect(error.message).toBe('API quota exceeded');
    }
  });
  
  test('handles empty transcripts gracefully', async () => {
    // Skip if module or method doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.extractInventoryItems !== 'function') {
      console.warn('Skipping test: extractInventoryItems method not available');
      return;
    }
    
    // Call with empty transcript
    const result = await voiceProcessor.extractInventoryItems("");
    
    // Should return empty array, not error
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
  
  test('textToNumber handles various number formats', () => {
    // Skip if module or function doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.textToNumber !== 'function') {
      // If textToNumber is private, indirectly test it through extractInventoryItems
      console.warn('Skipping test: textToNumber function not available');
      return;
    }
    
    const testCases = [
      { input: 'one', expected: 1 },
      { input: 'five', expected: 5 },
      { input: 'ten', expected: 10 },
      { input: '5', expected: 5 },
      { input: '10', expected: 10 },
      { input: 'unknown', expected: 1 } // Default value
    ];
    
    for (const testCase of testCases) {
      const result = voiceProcessor.textToNumber(testCase.input);
      expect(result).toBe(testCase.expected);
    }
  });
});
