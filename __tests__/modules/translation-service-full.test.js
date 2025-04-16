/**
 * Comprehensive coverage tests for translation-service
 */

// Define mock function variables globally
let mockApiTranslate;
let mockApiDetect;

// Mock logger globally - This is usually safe
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Translation Service - Full Coverage', () => {
  let translationService;
  let logger;

  beforeEach(() => {
    // 1. Reset modules to clear any cached versions
    jest.resetModules();

    // 2. Define the mock functions anew or re-initialize them
    mockApiTranslate = jest.fn();
    mockApiDetect = jest.fn();

    // 3. Mock dependencies *after* resetModules
    // Mock config to disable internal mock
    jest.doMock('../../config', () => ({
      ...jest.requireActual('../../config'), // Keep other config values
      testMockTranslate: false // Force disable internal mock
    }));

    // Mock the Google Cloud library
    jest.doMock('@google-cloud/translate', () => ({
      v2: {
        Translate: jest.fn().mockImplementation(() => ({
          translate: mockApiTranslate,
          detect: mockApiDetect
        }))
      }
    }), { virtual: true });

    // 4. Define mock implementations *after* mocks are in place
    mockApiTranslate.mockImplementation((text, options) => {
      if (Array.isArray(text)) {
        return Promise.resolve([text.map(t => `[API-${options.to}] ${t}`), {}]);
      }
      return Promise.resolve([`[API-${options.to}] ${text}`, {}]);
    });
    mockApiDetect.mockImplementation((text) => {
      if (text.includes('こんにちは')) return Promise.resolve([{ language: 'ja' }]);
      if (text.includes('bonjour')) return Promise.resolve([{ language: 'fr' }]);
      if (text === '') return Promise.resolve([{ language: 'und' }]);
      return Promise.resolve([{ language: 'en' }]);
    });

    // 5. Require the service *after* resetting modules and applying mocks
    translationService = require('../../modules/translation-service');
    logger = require('../../utils/logger'); // Re-require logger

    // 6. Clear mock function calls (but keep implementations)
    // Note: jest.clearAllMocks() might be redundant if resetModules works as expected,
    // but doesn't hurt. We clear specific mocks for clarity.
    mockApiTranslate.mockClear();
    mockApiDetect.mockClear();
    logger.info.mockClear();
    logger.error.mockClear();
    logger.warn.mockClear();
    logger.debug.mockClear();

    // 7. Clear cache if the function exists on the newly required service
    if (translationService.clearCache) {
      translationService.clearCache();
    }
  });

  afterAll(() => {
    // Clean up mocks applied with jest.doMock
    jest.unmock('../../config');
    jest.unmock('@google-cloud/translate');
  });

  describe('Core translation functions', () => {
    test('translate should translate text correctly', async () => {
      const result = await translationService.translate('hello', 'en', 'fr');
      expect(result).toBe('[API-fr] hello'); // Expect API mock result
      expect(mockApiTranslate).toHaveBeenCalledWith('hello', { from: 'en', to: 'fr' });
    });

    test('translate should skip translation if source equals target', async () => {
      const result = await translationService.translate('hello', 'en', 'en');
      expect(result).toBe('hello');
      expect(mockApiTranslate).not.toHaveBeenCalled();
    });

    test('translate should handle empty text', async () => {
      const result = await translationService.translate('', 'en', 'fr');
      expect(result).toBe('');
      expect(mockApiTranslate).not.toHaveBeenCalled();
    });

    test('translate should handle null text', async () => {
      const result = await translationService.translate(null, 'en', 'fr');
      expect(result).toBe('');
      expect(mockApiTranslate).not.toHaveBeenCalled();
    });

    test('detectLanguage should detect language correctly', async () => {
      const result = await translationService.detectLanguage('こんにちは');
      expect(result).toBe('ja');
      expect(mockApiDetect).toHaveBeenCalledWith('こんにちは');
    });

    test('detectLanguage should handle empty text', async () => {
      // No need to mock API specifically, as it shouldn't be called
      const result = await translationService.detectLanguage('');
      expect(result).toBe('en'); // Service should default to 'en'
      // Verify the mock API detect was NOT called due to the early return
      expect(mockApiDetect).not.toHaveBeenCalled(); // Changed from toHaveBeenCalledWith('')
    });

    test('detectLanguage should handle API errors', async () => {
      mockApiDetect.mockRejectedValueOnce(new Error('API Error')); // Specific mock for this test
      await expect(translationService.detectLanguage('text')).rejects.toThrow('API Error');
      expect(mockApiDetect).toHaveBeenCalledWith('text');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error detecting language'), expect.any(Error));
    });

    test('batchTranslate should translate array of texts', async () => {
      const texts = ['hello', 'world'];
      const result = await translationService.batchTranslate(texts, 'en', 'fr');
      expect(result).toEqual(['[API-fr] hello', '[API-fr] world']); // Expect API mock result
      expect(mockApiTranslate).toHaveBeenCalledWith(texts, { from: 'en', to: 'fr' });
    });

    test('batchTranslate should handle empty array', async () => {
      const result = await translationService.batchTranslate([], 'en', 'fr');
      expect(result).toEqual([]);
      expect(mockApiTranslate).not.toHaveBeenCalled();
    });
  });

  describe('Specialized translation functions', () => {
    const hasSpecializedFunctions = typeof require('../../modules/translation-service').translateEnglishToJapanese === 'function'; // Check original module

    (hasSpecializedFunctions ? test : test.skip)('translateEnglishToJapanese should translate from en to ja', async () => {
      await translationService.translateEnglishToJapanese('hello');
      expect(mockApiTranslate).toHaveBeenCalledWith('hello', { from: 'en', to: 'ja' });
    });

    (hasSpecializedFunctions ? test : test.skip)('translateJapaneseToEnglish should translate from ja to en', async () => {
      await translationService.translateJapaneseToEnglish('こんにちは');
      expect(mockApiTranslate).toHaveBeenCalledWith('こんにちは', { from: 'ja', to: 'en' });
    });

    (hasSpecializedFunctions ? test : test.skip)('translateJapaneseToFrench should translate from ja to fr', async () => {
      await translationService.translateJapaneseToFrench('こんにちは');
      expect(mockApiTranslate).toHaveBeenCalledWith('こんにちは', { from: 'ja', to: 'fr' });
    });
  });

  describe('Caching', () => {
    test('translate should use cache for repeated translations', async () => {
      const firstResult = await translationService.translate('hello', 'en', 'fr');
      expect(firstResult).toBe('[API-fr] hello'); // Expect API mock result
      expect(mockApiTranslate).toHaveBeenCalledTimes(1);
      expect(mockApiTranslate).toHaveBeenCalledWith('hello', { from: 'en', to: 'fr' });

      mockApiTranslate.mockClear(); // Clear calls, not implementation

      const secondResult = await translationService.translate('hello', 'en', 'fr');
      expect(secondResult).toBe('[API-fr] hello'); // Expect same result from cache
      expect(mockApiTranslate).not.toHaveBeenCalled(); // API mock not called again
    });

    test('clearCache should empty translation cache', async () => {
      await translationService.translate('hello', 'en', 'fr');
      expect(mockApiTranslate).toHaveBeenCalledTimes(1);
      mockApiTranslate.mockClear();

      translationService.clearCache(); // Clear the service's cache

      await translationService.translate('hello', 'en', 'fr');
      expect(mockApiTranslate).toHaveBeenCalledTimes(1); // API mock called again
    });
  });

  describe('Error handling', () => {
    test('translate should handle API errors', async () => {
      mockApiTranslate.mockRejectedValueOnce(new Error('API Error')); // Specific mock for this test
      await expect(translationService.translate('hello', 'en', 'fr')).rejects.toThrow('API Error');
      expect(mockApiTranslate).toHaveBeenCalledWith('hello', { from: 'en', to: 'fr' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating text'), expect.any(Error));
    });

    test('batchTranslate should handle API errors', async () => {
      mockApiTranslate.mockRejectedValueOnce(new Error('API Error')); // Specific mock for this test
      await expect(translationService.batchTranslate(['hello'], 'en', 'fr')).rejects.toThrow('API Error');
      expect(mockApiTranslate).toHaveBeenCalledWith(['hello'], { from: 'en', to: 'fr' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error batch translating texts'), expect.any(Error));
    });
  });
});
