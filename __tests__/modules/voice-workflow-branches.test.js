/**
 * Test file for voice-workflow.js branch coverage
 */
// Mock the dependencies
jest.mock('../../modules/voice-processor', () => ({
  processVoiceFile: jest.fn(),
  processAudio: jest.fn()
}));

jest.mock('../../utils/database-utils', () => ({
  saveInventoryItems: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const voiceWorkflow = require('../../modules/voice-workflow');
const voiceProcessor = require('../../modules/voice-processor');
const databaseUtils = require('../../utils/database-utils');
const logger = require('../../utils/logger');

describe('voice-workflow.js branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configure mocks with default implementation
    voiceProcessor.processVoiceFile.mockReset();
    databaseUtils.saveInventoryItems.mockReset();
    
    // Default successful response
    voiceProcessor.processVoiceFile.mockResolvedValue({
      transcript: '5 bottles of wine',
      items: [{ name: 'Wine', quantity: 5, unit: 'bottle' }]
    });
    
    databaseUtils.saveInventoryItems.mockResolvedValue({ success: true });
  });
  
  test('should process and save voice file successfully', async () => {
    const result = await voiceWorkflow.processAndSaveVoice(Buffer.from('audio'), 'bar', '2023-10');
    expect(result.success).toBe(true);
    expect(result.transcript).toBe('5 bottles of wine');
    expect(voiceProcessor.processVoiceFile).toHaveBeenCalledWith(Buffer.from('audio'), 'bar', '2023-10');
    expect(databaseUtils.saveInventoryItems).toHaveBeenCalledWith([{ name: 'Wine', quantity: 5, unit: 'bottle' }]);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Processing voice file'));
  });
  
  test('should handle missing transcript from processVoiceFile', async () => {
    voiceProcessor.processVoiceFile.mockResolvedValue({ items: [] });
    
    const result = await voiceWorkflow.processAndSaveVoice(Buffer.from('audio'), 'bar', '2023-10');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No transcript generated/);
    expect(databaseUtils.saveInventoryItems).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No transcript generated'));
  });
  
  test('should handle processVoiceFile throwing error', async () => {
    const processError = new Error('Processing failed');
    voiceProcessor.processVoiceFile.mockRejectedValue(processError);
    
    const result = await voiceWorkflow.processAndSaveVoice(Buffer.from('audio'), 'bar', '2023-10');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Processing failed/);
    expect(databaseUtils.saveInventoryItems).not.toHaveBeenCalled();
    // Fix the logger.error expectations to match implementation
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing voice file'));
  });
  
  test('should handle saveInventoryItems failure', async () => {
    const dbError = new Error('Database save failed');
    databaseUtils.saveInventoryItems.mockRejectedValue(dbError);
    
    const result = await voiceWorkflow.processAndSaveVoice(Buffer.from('audio'), 'bar', '2023-10');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Database save failed/);
    // Fix the logger.error expectations to match implementation
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing voice file'));
  });
  
  test('should skip saving inventory if no items', async () => {
    // Mock return with no items
    voiceProcessor.processVoiceFile.mockResolvedValue({ 
      transcript: 'nothing',
      items: []
    });
    
    const result = await voiceWorkflow.processAndSaveVoice(Buffer.from('audio'), 'bar', '2023-10');
    expect(result.success).toBe(true);
    expect(result.transcript).toBe('nothing');
    expect(databaseUtils.saveInventoryItems).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('No items extracted, skipping save'));
  });
  
  test('should handle missing items property', async () => {
    // Mock return with no items property
    voiceProcessor.processVoiceFile.mockResolvedValue({ 
      transcript: 'something'
    });
    
    const result = await voiceWorkflow.processAndSaveVoice(Buffer.from('audio'), 'bar', '2023-10');
    expect(result.success).toBe(true);
    expect(result.transcript).toBe('something');
    expect(databaseUtils.saveInventoryItems).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('No items extracted, skipping save'));
  });
});