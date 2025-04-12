<<<<<<< HEAD
const voiceProcessor = require('../../../modules/voice-processor');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('fake audio data')),
    mkdir: jest.fn().mockResolvedValue(undefined)
  },
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// Mock database-utils
jest.mock('../../../utils/database-utils', () => ({
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true }),
  findProductByName: jest.fn().mockImplementation(name => {
    if (name.toLowerCase().includes('wine')) {
      return { name: 'Wine', unit: 'bottle' };
    }
    return null;
  })
}));

describe('Voice Processor Module', () => {
  beforeEach(() => {
=======
// Test file for voice processor module
const fs = require('fs').promises;
const voiceProcessor = require('../../../modules/voice-processor');
const logger = require('../../../utils/logger');
const { ExternalServiceError } = require('../../../utils/error-handler');

// Mock dependencies
jest.mock('fs');
jest.mock('../../../utils/logger');

// Mock Deepgram
jest.mock('@deepgram/sdk', () => {
  return {
    Deepgram: jest.fn().mockImplementation(() => ({
      transcription: {
        preRecorded: jest.fn().mockReturnValue({
          transcribe: jest.fn().mockResolvedValue({
            results: {
              channels: [{
                alternatives: [{
                  transcript: 'five bottles of wine and three cans of beer',
                  confidence: 0.92
                }]
              }]
            }
          })
        })
      }
    }))
  };
});

describe('Voice Processor Module', () => {
  beforeEach(() => {
    // Clear mocks before each test
>>>>>>> backup-main
    jest.clearAllMocks();
  });
  
  test('processAudio handles audio files correctly', async () => {
    // Setup
<<<<<<< HEAD
    const filePath = 'test-audio.wav';
    
    // Execute
    const result = await voiceProcessor.processAudio(filePath);
=======
    const filePath = '/tmp/test-audio.wav';
    const location = 'bar';
    
    // Execute
    const result = await voiceProcessor.processAudio(filePath, location);
>>>>>>> backup-main
    
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
<<<<<<< HEAD
    const mockDeepgramPreRecordedFn = voiceProcessor.deepgram.transcription.preRecorded;
    const mockDeepgramTranscribeFn = mockDeepgramPreRecordedFn().transcribe;
    
    // Check that the mock was called with correct parameters
    expect(mockDeepgramPreRecordedFn).toHaveBeenCalled();
    expect(mockDeepgramTranscribeFn).toHaveBeenCalled();
  });
  
  test('extractInventoryItems recognizes quantities and products correctly', () => {
=======
    expect(voiceProcessor.deepgram.transcription.preRecorded).toHaveBeenCalledWith(
      {
        buffer: audioData,
        mimetype: expect.any(String)
      },
      expect.objectContaining({
        punctuate: true,
        language: expect.any(String)
      })
    );
  });
  
  test('extractInventoryItems recognizes quantities and products correctly', async () => {
>>>>>>> backup-main
    // Setup
    const transcript = 'five bottles of wine and three cans of beer';
    
    // Execute
<<<<<<< HEAD
    const items = voiceProcessor.extractInventoryItems(transcript);
=======
    const items = await voiceProcessor.extractInventoryItems(transcript);
>>>>>>> backup-main
    
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
<<<<<<< HEAD
    fs.readFile.mockRejectedValueOnce(new Error('File not found'));
    
    // Execute
    const result = await voiceProcessor.processAudio('nonexistent-file.wav');
=======
    const filePath = '/tmp/nonexistent-file.wav';
    fs.readFile.mockRejectedValueOnce(new Error('ENOENT: file not found'));
    
    // Execute
    const result = await voiceProcessor.processAudio(filePath);
>>>>>>> backup-main
    
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
<<<<<<< HEAD
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
=======
      await voiceProcessor.transcribeAudio(Buffer.from('test audio'));
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.message).toContain('Transcription failed');
    }
  });
  
  test('handles empty transcripts gracefully', async () => {
    // Execute
    const items = await voiceProcessor.extractInventoryItems('');
>>>>>>> backup-main
    
    // Verify
    expect(items).toEqual([]);
  });
  
  test('textToNumber handles various number formats', () => {
<<<<<<< HEAD
    // Execute & verify
    expect(voiceProcessor.textToNumber('5')).toBe(5);
    expect(voiceProcessor.textToNumber('five')).toBe(5);
=======
    // Verify
    expect(voiceProcessor.textToNumber('one')).toBe(1);
    expect(voiceProcessor.textToNumber('twenty')).toBe(20);
    expect(voiceProcessor.textToNumber('5')).toBe(5);
    expect(voiceProcessor.textToNumber('')).toBe(1);
>>>>>>> backup-main
    expect(voiceProcessor.textToNumber('unknown')).toBe(1);
  });
});
