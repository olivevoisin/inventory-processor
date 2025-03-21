// __tests__/integration/workflows/voice-recognition-workflow.test.js
const path = require('path');
const fs = require('fs').promises;
const voiceProcessor = require('../../../modules/voice-processor');
const dbUtils = require('../../../utils/database-utils');
const logger = require('../../../utils/logger');

// Sample test data
const sampleVoiceFile = path.join('__fixtures__', 'test-voice.mp3');
const sampleLocation = 'Bar';
const sampleTranscript = 'Ten bottles of vodka grey goose and 5 bottles of wine cabernet';

// Mock the modules
jest.mock('../../../modules/voice-processor', () => ({
  transcribeAudio: jest.fn().mockResolvedValue({
    transcript: sampleTranscript,
    confidence: 0.95
  }),
  extractInventoryItems: jest.fn().mockImplementation((transcript) => {
    // Simple extraction logic for testing
    const items = [];
    
    if (transcript.includes('vodka')) {
      items.push({ text: 'vodka grey goose', count: 10 });
    }
    
    if (transcript.includes('wine')) {
      items.push({ text: 'wine cabernet', count: 5 });
    }
    
    return items;
  })
}));

jest.mock('../../../utils/database-utils', () => ({
  findProductByName: jest.fn().mockImplementation((name) => {
    const products = {
      'vodka grey goose': { id: 1, name: 'Vodka Grey Goose', unit: 'bottle', price: '29.99' },
      'wine cabernet': { id: 2, name: 'Wine Cabernet', unit: 'bottle', price: '15.99' }
    };
    
    // Simulate fuzzy matching
    for (const [key, product] of Object.entries(products)) {
      if (key.includes(name.toLowerCase()) || name.toLowerCase().includes(key)) {
        return Promise.resolve(product);
      }
    }
    
    return Promise.resolve(null);
  }),
  saveInventoryItems: jest.fn().mockResolvedValue(true),
  saveUnknownItems: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// The actual workflow module to test
const voiceWorkflow = require('../../../modules/voice-workflow');

describe('Voice Recognition and Inventory Update Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('complete voice recognition workflow processes audio to inventory updates', async () => {
    // 1. Process the voice file
    const result = await voiceWorkflow.processVoiceRecording(sampleVoiceFile, sampleLocation);
    
    // 2. Verify audio was transcribed
    expect(voiceProcessor.transcribeAudio).toHaveBeenCalledWith(sampleVoiceFile);
    
    // 3. Verify products were identified from the transcript
    expect(dbUtils.findProductByName).toHaveBeenCalled();
    
    // 4. Verify inventory was updated with the recognized items
    expect(dbUtils.saveInventoryItems).toHaveBeenCalled();
    
    // 5. Verify result structure
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('recognizedItems');
    expect(result.recognizedItems).toHaveLength(2);
    expect(result.recognizedItems[0]).toHaveProperty('product', 'Vodka Grey Goose');
    expect(result.recognizedItems[0]).toHaveProperty('count', 10);
  });
  
  test('handles unknown products gracefully', async () => {
    // 1. Mock the extractInventoryItems to include an unknown product
    voiceProcessor.extractInventoryItems.mockReturnValueOnce([
      { text: 'vodka grey goose', count: 10 },
      { text: 'unknown product', count: 3 }
    ]);
    
    // 2. Mock the database to not find the unknown product
    dbUtils.findProductByName.mockImplementation((name) => {
      if (name.includes('unknown')) {
        return Promise.resolve(null);
      }
      
      return Promise.resolve({
        id: 1,
        name: 'Vodka Grey Goose',
        unit: 'bottle',
        price: '29.99'
      });
    });
    
    // 3. Process the voice file
    const result = await voiceWorkflow.processVoiceRecording(sampleVoiceFile, sampleLocation);
    
    // 4. Verify the error is logged
    expect(logger.warn).toHaveBeenCalled();
  });
  
  test('handles transcription errors gracefully', async () => {
    // 1. Mock a transcription error
    voiceProcessor.transcribeAudio.mockRejectedValueOnce(new Error('Transcription failed'));
    
    // 2. Process the voice file and expect an error
    await expect(
      voiceWorkflow.processVoiceRecording(sampleVoiceFile, sampleLocation)
    ).rejects.toThrow('Transcription failed');
    
    // 3. Verify the error is logged
    expect(logger.error).toHaveBeenCalled();
    
    // 4. Verify no database operations were performed
    expect(dbUtils.saveInventoryItems).not.toHaveBeenCalled();
  });
  
  test('handles empty transcripts gracefully', async () => {
    // 1. Mock an empty transcript
    voiceProcessor.transcribeAudio.mockResolvedValueOnce({
      transcript: '',
      confidence: 0
    });
    
    // 2. Process the voice file
    const result = await voiceWorkflow.processVoiceRecording(sampleVoiceFile, sampleLocation);
    
    // 3. Verify the result
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('recognizedItems');
    expect(result.recognizedItems).toHaveLength(0);
    expect(result).toHaveProperty('warning', 'No inventory items could be recognized');
  });
});
