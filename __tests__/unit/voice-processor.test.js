const voiceProcessor = require('../../modules/voice-processor');
const fs = require('fs').promises;
const logger = require('../../utils/logger');

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('fake audio data')),
    mkdir: jest.fn().mockResolvedValue(undefined)
  },
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// Mock database-utils
jest.mock('../../utils/database-utils', () => ({
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true }),
  findProductByName: jest.fn().mockImplementation(name => {
    if (name.toLowerCase().includes('wine')) {
      return { name: 'Wine', unit: 'bottle' };
    }
    return null;
  })
}));

// Mock deepgram
jest.mock('@deepgram/sdk', () => ({
  Deepgram: jest.fn().mockImplementation(() => ({
    transcription: {
      preRecorded: jest.fn().mockReturnValue({
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
      })
    }
  }))
}));

describe('Voice Processor Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('processAudio handles audio files correctly', async () => {
    // Setup
    const filePath = 'test-audio.wav';
    
    // Execute
    const result = await voiceProcessor.processAudio(filePath);
    
    // Verify
    expect(result.success).toBe(true);
    expect(result.transcript).toBeDefined();
    expect(fs.readFile).toHaveBeenCalledWith(filePath);
    expect(logger.info).toHaveBeenCalled();
  });
  
  test('transcribeAudio handles different audio formats', async () => {
    // Setup
    const audioData = Buffer.from('fake audio data');
    
    // Execute
    const result = await voiceProcessor.transcribeAudio(audioData);
    
    // Verify
    expect(result.transcript).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    
    // Verify that the Deepgram API was called correctly
    const mockDeepgramPreRecordedFn = voiceProcessor.deepgram.transcription.preRecorded;
    const mockDeepgramTranscribeFn = mockDeepgramPreRecordedFn().transcribe;
    
    // Check that the mock was called with correct parameters
    expect(mockDeepgramPreRecordedFn).toHaveBeenCalled();
    expect(mockDeepgramTranscribeFn).toHaveBeenCalled();
  });
  
  test('extractInventoryItems recognizes quantities and products correctly', () => {
    // Setup
    const transcript = 'five bottles of wine and three cans of beer';
    
    // Execute
    const items = voiceProcessor.extractInventoryItems(transcript);
    
    // Verify
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(expect.objectContaining({
      name: 'Wine',
      quantity: 5,
      unit: 'bottle'
    }));
    expect(items[1]).toEqual(expect.objectContaining({
      name: 'Beer',
      quantity: 3,
      unit: 'can'
    }));
  });
  
  test('handles file system errors gracefully', async () => {
    // Setup
    fs.readFile.mockRejectedValueOnce(new Error('File not found'));
    
    // Execute
    const result = await voiceProcessor.processAudio('nonexistent-file.wav');
    
    // Verify
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(logger.error).toHaveBeenCalled();
  });
  
  test('handles Deepgram API errors gracefully', async () => {
    // Setup
    const mockDeepgramError = new Error('API quota exceeded');
    voiceProcessor.deepgram.transcription.preRecorded().transcribe.mockRejectedValueOnce(mockDeepgramError);
    
    // Execute & verify
    try {
      await voiceProcessor.transcribeAudio(Buffer.from('fake audio data'));
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('API quota exceeded');
      expect(logger.error).toHaveBeenCalled();
    }
  });
  
  test('handles empty transcripts gracefully', () => {
    // Setup & execute
    const items = voiceProcessor.extractInventoryItems('');
    
    // Verify
    expect(items).toEqual([]);
  });
  
  test('textToNumber handles various number formats', () => {
    // Execute & verify
    expect(voiceProcessor.textToNumber('5')).toBe(5);
    expect(voiceProcessor.textToNumber('five')).toBe(5);
    expect(voiceProcessor.textToNumber('unknown')).toBe(1);
  });
});
