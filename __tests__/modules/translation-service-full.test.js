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
  let config; // To control testMockTranslate

  beforeEach(() => {
    // 1. Reset modules to clear any cached versions
    jest.resetModules();

    // 2. Define the mock functions anew or re-initialize them
    mockApiTranslate = jest.fn();
    mockApiDetect = jest.fn();

    // 3. Mock dependencies *after* resetModules
    // Mock config - allow controlling testMockTranslate per test if needed
    jest.doMock('../../config', () => ({
      // Start with default values, tests can override via jest.doMock again if needed
      testMockTranslate: false, // Default to using API mock
      googleCloud: { projectId: 'mock-project', keyFilename: 'mock-key.json' },
      ...jest.requireActual('../../config'), // Keep other actual config values
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
      // Simulate API behavior based on input type
      if (Array.isArray(text)) {
        return Promise.resolve([text.map(t => `[API-${options?.to || 'fr'}] ${t}`), {}]);
      }
      return Promise.resolve([`[API-${options?.to || 'fr'}] ${text}`, {}]);
    });
    mockApiDetect.mockImplementation((text) => {
      if (text.includes('こんにちは')) return Promise.resolve([{ language: 'ja' }]);
      if (text.includes('bonjour')) return Promise.resolve([{ language: 'fr' }]);
      if (text === '') return Promise.resolve([{ language: 'und' }]); // Simulate 'und' for empty
      return Promise.resolve([{ language: 'en' }]);
    });

    // 5. Require the service *after* resetting modules and applying mocks
    translationService = require('../../modules/translation-service');
    logger = require('../../utils/logger'); // Re-require logger
    config = require('../../config'); // Re-require config

    // 6. Clear mock function calls
    mockApiTranslate.mockClear();
    mockApiDetect.mockClear();
    logger.info.mockClear();
    logger.error.mockClear();
    logger.warn.mockClear();
    logger.debug.mockClear();

    // 7. Clear cache
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

    test('detectLanguage should handle API errors by returning fallback', async () => {
      mockApiDetect.mockRejectedValueOnce(new Error('API Error')); // Specific mock for this test
      const result = await translationService.detectLanguage('text');
      expect(result).toBe('en'); // Fallback language
      expect(mockApiDetect).toHaveBeenCalledWith('text');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error detecting language via API: API Error'), expect.any(Error));
    });

    test('detectLanguage should return "en" if API returns "und"', async () => {
      mockApiDetect.mockResolvedValueOnce([{ language: 'und' }]); // Simulate API returning 'und'
      const result = await translationService.detectLanguage('some ambiguous text');
      expect(result).toBe('en'); // Should default to 'en'
      expect(mockApiDetect).toHaveBeenCalledWith('some ambiguous text');
    });

    test('translate should handle "auto" source language detection via API', async () => {
      // Mock detectLanguage to return 'fr' when called by translate
      mockApiDetect.mockResolvedValueOnce([{ language: 'fr' }]);
      // Mock translate to expect 'fr' as source
      mockApiTranslate.mockResolvedValueOnce(['[API-en] bonjour', {}]);

      const result = await translationService.translate('bonjour', 'auto', 'en');

      expect(result).toBe('[API-en] bonjour');
      // Verify detect was called (implicitly by translate)
      expect(mockApiDetect).toHaveBeenCalledWith('bonjour');
      // Verify translate was called with the detected language
      expect(mockApiTranslate).toHaveBeenCalledWith('bonjour', { from: 'fr', to: 'en' });
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

    test('batchTranslate should handle "auto" source language detection via API', async () => {
      // Mock detectLanguage to return 'fr' when called by batchTranslate
      mockApiDetect.mockResolvedValueOnce([{ language: 'fr' }]);
      // Mock batch translate to expect 'fr' as source
      mockApiTranslate.mockResolvedValueOnce([['[API-en] bonjour', '[API-en] monde'], {}]);

      const result = await translationService.batchTranslate(['bonjour', 'monde'], 'auto', 'en');

      expect(result).toEqual(['[API-en] bonjour', '[API-en] monde']);
      // Verify detect was called (implicitly by batchTranslate for the first item)
      expect(mockApiDetect).toHaveBeenCalledWith('bonjour');
      // Verify batch translate was called with the detected language
      expect(mockApiTranslate).toHaveBeenCalledWith(['bonjour', 'monde'], { from: 'fr', to: 'en' });
    });

    test('batchTranslate fallback should return fallback strings for failed items', async () => {
      // Make batch API fail
      mockApiTranslate.mockImplementation((texts, options) => {
        if (Array.isArray(texts)) {
          return Promise.reject(new Error('Batch API Unavailable'));
        }
        // Simulate individual translate failing for the second item during fallback
        if (texts === 'text2') {
          return Promise.reject(new Error('Individual translate failed'));
        }
        return Promise.resolve([`[API-${options.to}] ${texts}`, {}]);
      });

      const texts = ['text1', 'text2'];
      const result = await translationService.batchTranslate(texts, 'en', 'de');

      expect(result).toEqual(['[API-de] text1', '[de] text2']);
      expect(mockApiTranslate).toHaveBeenCalledWith(texts, { from: 'en', to: 'de' }); // Batch attempt
      expect(mockApiTranslate).toHaveBeenCalledWith('text1', { from: 'en', to: 'de' }); // First fallback attempt
      expect(mockApiTranslate).toHaveBeenCalledWith('text2', { from: 'en', to: 'de' }); // Second fallback attempt (failed)
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error batch translating texts via API: Batch API Unavailable'), expect.any(Error));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating text via API: Individual translate failed'), expect.any(Error));
    });
  });

  describe('Initialization', () => {
    test('should log error if Google Translate client fails to initialize', () => {
      jest.resetModules();
      // Mock the library to throw during construction
      jest.doMock('@google-cloud/translate', () => ({
        v2: {
          Translate: jest.fn().mockImplementation(() => {
            throw new Error('Initialization failed');
          })
        }
      }), { virtual: true });
      jest.doMock('../../config', () => ({ testMockTranslate: false })); // Ensure API is attempted

      // Require modules after setting up the failing mock
      const failingLogger = require('../../utils/logger');
      require('../../modules/translation-service'); // Initialize the service

      expect(failingLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize Google Translate client: Initialization failed'));

      // Cleanup mocks for subsequent tests
      jest.unmock('@google-cloud/translate');
      jest.unmock('../../config');
    });
  });

  describe('Specialized translation functions', () => {
    const hasSpecializedFunctions = typeof translationService?.translateEnglishToJapanese === 'function';

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
    test('translate should return fallback format on API errors', async () => {
      mockApiTranslate.mockRejectedValueOnce(new Error('API Error'));
      const result = await translationService.translate('hello', 'en', 'fr');
      expect(result).toBe('[fr] hello'); // Fallback format
      expect(mockApiTranslate).toHaveBeenCalledWith('hello', { from: 'en', to: 'fr' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating text via API: API Error'), expect.any(Error));
    });

    test('batchTranslate should return fallback formats on API errors', async () => {
      // Ensure consistent rejection for both batch and fallback attempts
      mockApiTranslate.mockImplementation(() => Promise.reject(new Error('API Error')));
      const result = await translationService.batchTranslate(['hello'], 'en', 'fr');
      expect(result).toEqual(['[fr] hello']); // Fallback format for the item
      expect(mockApiTranslate).toHaveBeenCalledWith(['hello'], { from: 'en', to: 'fr' }); // Batch API attempt
      // Check that the individual translate fallback was also attempted
      expect(mockApiTranslate).toHaveBeenCalledWith('hello', { from: 'en', to: 'fr' });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error batch translating texts via API: API Error'), expect.any(Error));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating text via API: API Error'), expect.any(Error));
    });

    test('detectLanguage should return fallback language on API errors', async () => {
      mockApiDetect.mockRejectedValueOnce(new Error('API Error'));
      const result = await translationService.detectLanguage('some text');
      expect(result).toBe('en'); // Fallback language
      expect(mockApiDetect).toHaveBeenCalledWith('some text');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error detecting language via API: API Error'), expect.any(Error));
    });
  });

  describe('Fallback and Mock Logic', () => {
    beforeEach(() => {
      mockApiTranslate.mockImplementation(() => Promise.reject(new Error('API Unavailable')));
      mockApiDetect.mockImplementation(() => Promise.reject(new Error('API Unavailable')));
    });

    test('detectLanguage should use pattern matching if API fails', async () => {
      // API mock rejects in beforeEach
      const langJa = await translationService.detectLanguage('こんにちは世界');
      const langFr = await translationService.detectLanguage('Bonjour le monde'); // Test with common French word
      const langEn = await translationService.detectLanguage('Hello world');

      expect(langJa).toBe('ja');
      expect(langFr).toBe('fr'); // Expect French detection to work now
      expect(langEn).toBe('en');
      expect(mockApiDetect).toHaveBeenCalledTimes(3); // API was called but failed
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error detecting language via API: API Unavailable'), expect.any(Error));
    });

    test('translate should use fallback format if API fails', async () => {
      const result = await translationService.translate('test text', 'en', 'es');
      expect(result).toBe('[es] test text'); // Expect fallback format
      expect(mockApiTranslate).toHaveBeenCalledTimes(1); // API was called but failed
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating text via API: API Unavailable'), expect.any(Error));
    });

    test('batchTranslate should use fallback if API fails', async () => {
      const result = await translationService.batchTranslate(['text1', 'text2'], 'en', 'de');
      expect(result).toEqual(['[de] text1', '[de] text2']);
      expect(mockApiTranslate).toHaveBeenCalledTimes(3); // Batch API called once and failed, fallback attempts
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error batch translating texts via API: API Unavailable'), expect.any(Error));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating text via API: API Unavailable'), expect.any(Error));
    });

    test('translate should use internal mock dictionary when testMockTranslate is true', async () => {
      jest.resetModules();
      jest.doMock('../../config', () => ({ testMockTranslate: true }));
      jest.doMock('@google-cloud/translate', () => ({ v2: { Translate: jest.fn() } }), { virtual: true });

      const mockTranslationService = require('../../modules/translation-service');
      const mockLogger = require('../../utils/logger');

      const resultFrEn = await mockTranslationService.translate('vin rouge', 'fr', 'en');
      expect(resultFrEn).toBe('red wine');

      const resultJaFr = await mockTranslationService.translate('ビール', 'ja', 'fr');
      expect(resultJaFr).toBe('Bière');

      const resultMissing = await mockTranslationService.translate('unknown text', 'en', 'de');
      expect(resultMissing).toBe('[de] unknown text');

      expect(mockLogger.warn).toHaveBeenCalledWith('Using internal mock for translation service.');

      jest.unmock('../../config');
      jest.unmock('@google-cloud/translate');
    });
  });

  describe('translateItems', () => {
    test('should translate product names in an array of items', async () => {
      const items = [
        { product: 'vin rouge', quantity: 2 },
        { product_name: 'bière blonde', count: 6 },
        { name: 'whisky', qty: 1 }
      ];
      const result = await translationService.translateItems(items, 'fr', 'en');

      expect(result).toHaveLength(3);
      expect(mockApiTranslate).toHaveBeenCalledTimes(3); // Called for each item
      expect(mockApiTranslate).toHaveBeenCalledWith('vin rouge', { from: 'fr', to: 'en' });
      expect(mockApiTranslate).toHaveBeenCalledWith('bière blonde', { from: 'fr', to: 'en' });
      expect(mockApiTranslate).toHaveBeenCalledWith('whisky', { from: 'fr', to: 'en' });

      expect(result[0].translated_name).toBe('[API-en] vin rouge');
      expect(result[0].original_name).toBe('vin rouge');
      expect(result[1].translated_name).toBe('[API-en] bière blonde');
      expect(result[1].original_name).toBe('bière blonde');
      expect(result[2].translated_name).toBe('[API-en] whisky');
      expect(result[2].original_name).toBe('whisky');
    });

    test('should handle empty items array', async () => {
      const result = await translationService.translateItems([], 'fr', 'en');
      expect(result).toEqual([]);
      expect(mockApiTranslate).not.toHaveBeenCalled();
    });

    test('should handle null/undefined items array', async () => {
      const resultNull = await translationService.translateItems(null, 'fr', 'en');
      expect(resultNull).toEqual([]);
      const resultUndefined = await translationService.translateItems(undefined, 'fr', 'en');
      expect(resultUndefined).toEqual([]);
      expect(mockApiTranslate).not.toHaveBeenCalled();
    });

    test('should handle items with missing product names', async () => {
      const items = [{ quantity: 1 }, { product: 'vin rouge' }];
      const result = await translationService.translateItems(items, 'fr', 'en');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ quantity: 1 });
      expect(result[1].translated_name).toBe('[API-en] vin rouge');
      expect(mockApiTranslate).toHaveBeenCalledTimes(1); // Only called for the second item
    });

    test('should handle "auto" source language detection', async () => {
      // Mock detectLanguage to return 'fr' for the first item's name
      mockApiDetect.mockResolvedValueOnce([{ language: 'fr' }]);
      // Mock translate to expect 'fr'
      mockApiTranslate.mockImplementation((text, options) => {
        if (options.from === 'fr') {
          return Promise.resolve([`[API-en] ${text}`, {}]);
        }
        return Promise.reject(new Error('Unexpected source language'));
      });

      const items = [{ product: 'vin rouge' }];
      const result = await translationService.translateItems(items, 'auto', 'en');

      expect(result).toHaveLength(1);
      expect(result[0].translated_name).toBe('[API-en] vin rouge');
      // Verify detectLanguage was called within translate called by translateItems
      expect(mockApiDetect).toHaveBeenCalledWith('vin rouge');
      // Verify translate was called with detected language
      expect(mockApiTranslate).toHaveBeenCalledWith('vin rouge', { from: 'fr', to: 'en' });
    });

    test('should handle translation errors within the loop and return modified items with fallback', async () => {
      mockApiTranslate
        .mockResolvedValueOnce(['[API-en] vin rouge', {}]) // First call succeeds
        .mockRejectedValueOnce(new Error('Item translation failed')); // Second call fails

      const items = [{ product: 'vin rouge' }, { product: 'bière' }];
      const result = await translationService.translateItems(items, 'fr', 'en');

      expect(result).toEqual([
        { product: 'vin rouge', original_name: 'vin rouge', translated_name: '[API-en] vin rouge' },
        { product: 'bière', original_name: 'bière', translated_name: '[en] bière' }
      ]);
      // Update assertion to expect the error object as the second argument
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error translating text via API: Item translation failed'), expect.any(Error));
      expect(mockApiTranslate).toHaveBeenCalledTimes(2); // Both were attempted
    });

    test('should use internal mock dictionary when testMockTranslate is true', async () => {
      jest.resetModules();
      jest.doMock('../../config', () => ({
        ...jest.requireActual('../../config'), // Keep other actual config values
        testMockTranslate: true,
        googleCloud: { projectId: 'mock-project', keyFilename: 'mock-key.json' }, // Need this for init check
      }));
      jest.doMock('@google-cloud/translate', () => ({ v2: { Translate: jest.fn() } }), { virtual: true });

      const mockTranslationService = require('../../modules/translation-service');

      const items = [
        { product: 'vin rouge', quantity: 2 },
        { product_name: 'bière blonde', count: 6 },
        { name: 'whisky', qty: 1 }
      ];
      const result = await mockTranslationService.translateItems(items, 'fr', 'en');

      expect(result).toHaveLength(3);
      expect(result[0].translated_name).toBe('red wine'); // From internal mock
      expect(result[1].translated_name).toBe('light beer'); // From internal mock
      expect(result[2].translated_name).toBe('whiskey'); // From internal mock

      expect(result[0].original_name).toBe('vin rouge');
      expect(result[1].original_name).toBe('bière blonde');
      expect(result[2].original_name).toBe('whisky');

      jest.unmock('../../config');
      jest.unmock('@google-cloud/translate');
    });
  });
});
