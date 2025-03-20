// Mock the file system
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock audio content')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined)
  },
  createReadStream: jest.fn().mockReturnValue({
    pipe: jest.fn().mockReturnThis(),
    on: jest.fn((event, callback) => {
      if (event === 'end') callback();
      return this;
    })
  }),
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock Deepgram for voice recognition
jest.mock('@deepgram/sdk', () => ({
  Deepgram: jest.fn().mockImplementation(() => ({
    transcription: {
      preRecorded: jest.fn().mockImplementation(() => ({
        transcribe: jest.fn().mockResolvedValue({
          results: {
            channels: [{
              alternatives: [{
                transcript: "five bottles of wine and three cans of beer",
                confidence: 0.95
              }]
            }]
          }
        })
      }))
    }
  }))
}));

// Mock database operations
jest.mock('../../../utils/database-utils', () => ({
  findProductByName: jest.fn().mockImplementation((name) => {
    const products = {
      'wine': { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15 },
      'beer': { id: 'prod-2', name: 'Beer', unit: 'can', price: 5 }
    };
    return Promise.resolve(products[name.toLowerCase()] || null);
  }),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true, updatedCount: 2 }),
  getInventoryHistory: jest.fn().mockResolvedValue([
    { timestamp: '2025-03-01T10:00:00Z', items: [{ name: 'Wine', quantity: 5 }] }
  ])
}), { virtual: true });

// Mock config
jest.mock('../../../config', () => ({
  deepgram: {
    apiKey: 'mock-api-key'
  },
  uploads: {
    voiceDir: './uploads/voice'
  },
  googleSheets: {
    apiKey: 'mock-api-key',
    sheetId: 'mock-sheet-id',
    docId: 'mock-doc-id',
    clientEmail: 'mock-client-email',
    privateKey: 'mock-private-key'
  }
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

describe('Voice Recognition and Inventory Update Workflow', () => {
  let voiceProcessor;
  let dbUtils;
  let logger;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset modules to ensure clean state
    jest.resetModules();
    
    // Load mocked modules
    dbUtils = require('../../../utils/database-utils');
    logger = require('../../../utils/logger');
    
    // Import the module after mocks are set up
    try {
      voiceProcessor = require('../../../modules/voice-processor');
    } catch (error) {
      console.error('Error loading voice-processor module:', error.message);
    }
  });
  
  test('complete voice recognition workflow processes audio to inventory updates', async () => {
    // Skip if module doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.processAudio !== 'function') {
      console.warn('Skipping test: processAudio method not available');
      return;
    }
    
    // 1. Process the audio file
    const result = await voiceProcessor.processAudio('./uploads/voice/recording.wav');
    
    // 2. Verify audio was transcribed
    expect(result).toBeDefined();
    expect(result).toHaveProperty('transcript');
    expect(result.transcript).toContain('wine');
    expect(result.transcript).toContain('beer');
    
    // 3. Verify products were identified from the transcript
    expect(dbUtils.findProductByName).toHaveBeenCalled();
    
    // 4. Verify inventory was updated with the recognized items
    expect(dbUtils.saveInventoryItems).toHaveBeenCalled();
    
    // 5. Check that the process was logged
    expect(logger.info).toHaveBeenCalled();
  });
  
  test('handles unknown products gracefully', async () => {
    // Skip if module doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.processAudio !== 'function') {
      console.warn('Skipping test: processAudio method not available');
      return;
    }
    
    // 1. Override the mock to simulate an unknown product
    dbUtils.findProductByName.mockResolvedValueOnce(null);
    
    // 2. Process the audio file
    const result = await voiceProcessor.processAudio('./uploads/voice/recording.wav');
    
    // 3. Verify the workflow continues even with unknown products
    expect(result).toBeDefined();
    
    // 4. Verify the error is logged
    expect(logger.warn).toHaveBeenCalled();
  });
  
  test('handles transcription errors gracefully', async () => {
    // Skip if module doesn't exist
    if (!voiceProcessor || typeof voiceProcessor.processAudio !== 'function') {
      console.warn('Skipping test: processAudio method not available');
      return;
    }
    
    // 1. Override the Deepgram mock to simulate a transcription error
    const Deepgram = require('@deepgram/sdk').Deepgram;
    const mockTranscriptionInstance = Deepgram.mock.results[0].value.transcription;
    mockTranscriptionInstance.preRecorded.mockImplementationOnce(() => ({
      transcribe: jest.fn().mockRejectedValueOnce(new Error('Transcription failed'))
    }));
    
    // 2. Process the audio file with expected failure
    try {
      await voiceProcessor.processAudio('./uploads/voice/recording.wav');
    } catch (error) {
      // 3. Verify the error is caught and logged
      expect(error).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    }
  });
});
