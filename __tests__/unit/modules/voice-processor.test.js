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
    jest.clearAllMocks();
  });
  
  test('processAudio handles audio files correctly', async () => {
    // Setup
    const filePath = '/tmp/test-audio.wav';
    const location = 'bar';
    
    // Execute
    const result = await voiceProcessor.processAudio(filePath, location);
    
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
    // Setup
    const transcript = 'five bottles of wine and three cans of beer';
    
    // Execute
    const items = await voiceProcessor.extractInventoryItems(transcript);
    
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
    const filePath = '/tmp/nonexistent-file.wav';
    fs.readFile.mockRejectedValueOnce(new Error('ENOENT: file not found'));
    
    // Execute
    const result = await voiceProcessor.processAudio(filePath);
    
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
    
    // Verify
    expect(items).toEqual([]);
  });
  
  test('textToNumber handles various number formats', () => {
    // Verify
    expect(voiceProcessor.textToNumber('one')).toBe(1);
    expect(voiceProcessor.textToNumber('twenty')).toBe(20);
    expect(voiceProcessor.textToNumber('5')).toBe(5);
    expect(voiceProcessor.textToNumber('')).toBe(1);
    expect(voiceProcessor.textToNumber('unknown')).toBe(1);
  });
});
