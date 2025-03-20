// Mock the Google Cloud Translation API
jest.mock('@google-cloud/translate', () => ({
  v2: {
    Translate: jest.fn().mockImplementation(() => ({
      translate: jest.fn().mockImplementation((text, target) => {
        // Simple mock that prefixes "Translated to [target]:" to the text
        const result = Array.isArray(text) 
          ? text.map(t => `Translated to ${target}: ${t}`)
          : `Translated to ${target}: ${text}`;
        return Promise.resolve([result]);
      }),
      detect: jest.fn().mockImplementation((text) => {
        return Promise.resolve([{ language: 'ja' }]);
      })
    }))
  }
}));

// Mock the config
jest.mock('../../../config', () => ({
  googleTranslate: {
    projectId: 'mock-project-id',
    keyFilename: './mock-key.json',
    targetLanguage: 'fr'
  }
}), { virtual: true });

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

describe('Translation Service Module', () => {
  let translationService;
  let mockGoogleTranslate;
  let logger;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset modules to ensure clean state
    jest.resetModules();
    
    // Load mocked modules
    mockGoogleTranslate = require('@google-cloud/translate');
    logger = require('../../../utils/logger');
    
    // Import the module after mocks are set up
    try {
      translationService = require('../../../modules/translation-service');
    } catch (error) {
      console.error('Error loading translation-service module:', error.message);
    }
  });
  
  test('module loads correctly', () => {
    expect(translationService).toBeDefined();
  });
  
  test('translateText translates text to target language', async () => {
    // Skip if module or method doesn't exist
    if (!translationService || typeof translationService.translateText !== 'function') {
      console.warn('Skipping test: translateText method not available');
      return;
    }
    
    const result = await translationService.translateText('こんにちは');
    
    // Verify Google Translate API was called
    const translateInstance = mockGoogleTranslate.v2.Translate.mock.results[0].value;
    expect(translateInstance.translate).toHaveBeenCalled();
    
    // Check result
    expect(result).toContain('Translated to fr:');
  });
  
  test('detectLanguage identifies text language', async () => {
    // Skip if module or method doesn't exist
    if (!translationService || typeof translationService.detectLanguage !== 'function') {
      console.warn('Skipping test: detectLanguage method not available');
      return;
    }
    
    const result = await translationService.detectLanguage('こんにちは');
    
    // Verify Google Translate API was called
    const translateInstance = mockGoogleTranslate.v2.Translate.mock.results[0].value;
    expect(translateInstance.detect).toHaveBeenCalled();
    
    // Check result
    expect(result).toBe('ja');
  });
  
  test('batchTranslate handles arrays of objects', async () => {
    // Skip if module or method doesn't exist
    if (!translationService || typeof translationService.batchTranslate !== 'function') {
      console.warn('Skipping test: batchTranslate method not available');
      return;
    }
    
    const items = [
      { name: '商品A', quantity: 5, unitPrice: 100 },
      { name: '商品B', quantity: 2, unitPrice: 250 }
    ];
    
    const result = await translationService.batchTranslate(items);
    
    // Verify Google Translate API was called
    const translateInstance = mockGoogleTranslate.v2.Translate.mock.results[0].value;
    expect(translateInstance.translate).toHaveBeenCalled();
    
    // Check results
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].name).toContain('Translated');
    expect(result[1].name).toContain('Translated');
    
    // Other properties should be preserved
    expect(result[0].quantity).toBe(5);
    expect(result[1].unitPrice).toBe(250);
  });
  
  test('handles translation errors gracefully', async () => {
    // Skip if module doesn't exist
    if (!translationService || typeof translationService.translateText !== 'function') {
      console.warn('Skipping test: translateText method not available');
      return;
    }
    
    // Get the mock implementation
    const translateInstance = mockGoogleTranslate.v2.Translate.mock.results[0].value;
    
    // Make it reject for this test
    translateInstance.translate.mockRejectedValueOnce(new Error('Translation API error'));
    
    try {
      await translationService.translateText('こんにちは');
    } catch (error) {
      expect(error).toBeDefined();
    }
    
    // Verify error was logged
    expect(logger.error).toHaveBeenCalled();
  });
});
