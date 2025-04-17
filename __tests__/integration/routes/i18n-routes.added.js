/**
 * Unit tests for i18n routes
 */
const express = require('express');
const request = require('supertest');
const translationService = require('../../../modules/translation-service'); // Changed from ../../modules/translation-service

// Mock the translation service
jest.mock('../../../modules/translation-service', () => ({ // Changed path to ../../../
  translate: jest.fn().mockImplementation((text, source, target) => {
    return Promise.resolve(`[${target}] ${text}`);
  }),
  detectLanguage: jest.fn().mockResolvedValue('en')
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock the auth middleware
jest.mock('../../../middleware/auth', () => ({
  authenticateApiKey: (req, res, next) => next()
}));

// Create a test app with i18n routes
const i18nRoutes = require('../../../routes/i18n-routes');
const app = express();
app.use(express.json());
app.use('/api/i18n', i18nRoutes);

describe('I18n Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/i18n/translate', () => {
    test('should translate text from source to target language', async () => {
      const response = await request(app)
        .post('/api/i18n/translate')
        .send({
          text: 'Hello world',
          source: 'en',
          target: 'fr'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.translated).toBe('[fr] Hello world');
      expect(translationService.translate).toHaveBeenCalledWith('Hello world', 'en', 'fr');
    });
    
    test('should auto-detect source language if not provided', async () => {
      const response = await request(app)
        .post('/api/i18n/translate')
        .send({
          text: 'こんにちは世界',
          target: 'en'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.translated).toBe('[en] こんにちは世界');
      expect(translationService.detectLanguage).toHaveBeenCalledWith('こんにちは世界');
      expect(translationService.translate).toHaveBeenCalledWith('こんにちは世界', 'ja', 'en');
    });
    
    test('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/i18n/translate')
        .send({
          source: 'en',
          target: 'fr'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    test('should return 400 if target language is missing', async () => {
      const response = await request(app)
        .post('/api/i18n/translate')
        .send({
          text: 'Hello world',
          source: 'en'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    test('should handle translation service errors', async () => {
      translationService.translate.mockRejectedValueOnce(new Error('Translation service error'));
      
      const response = await request(app)
        .post('/api/i18n/translate')
        .send({
          text: 'Hello world',
          source: 'en',
          target: 'fr'
        });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/i18n/batch-translate', () => {
    test('should translate an array of texts', async () => {
      const response = await request(app)
        .post('/api/i18n/batch-translate')
        .send({
          texts: ['Hello', 'World'],
          source: 'en',
          target: 'fr'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.translated).toEqual(['[fr] Hello', '[fr] World']);
      expect(translationService.batchTranslate).toHaveBeenCalledWith(['Hello', 'World'], 'en', 'fr');
    });
    
    test('should auto-detect source language if not provided', async () => {
      // Mock detectLanguage to return a specific language for the first text
      translationService.detectLanguage.mockResolvedValueOnce('fr');
      
      const response = await request(app)
        .post('/api/i18n/batch-translate')
        .send({
          texts: ['bonjour', 'comment allez-vous'],
          target: 'en'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(translationService.detectLanguage).toHaveBeenCalledWith('bonjour');
      expect(translationService.batchTranslate).toHaveBeenCalledWith(['bonjour', 'comment allez-vous'], 'fr', 'en');
    });
    
    test('should return 400 if texts is missing', async () => {
      const response = await request(app)
        .post('/api/i18n/batch-translate')
        .send({
          source: 'en',
          target: 'fr'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    test('should return 400 if texts is not an array', async () => {
      const response = await request(app)
        .post('/api/i18n/batch-translate')
        .send({
          texts: 'not an array',
          source: 'en',
          target: 'fr'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    test('should handle translation service errors', async () => {
      translationService.batchTranslate.mockRejectedValueOnce(new Error('Translation service error'));
      
      const response = await request(app)
        .post('/api/i18n/batch-translate')
        .send({
          texts: ['Hello', 'World'],
          source: 'en',
          target: 'fr'
        });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/i18n/detect-language', () => {
    test('should detect the language of provided text', async () => {
      const response = await request(app)
        .post('/api/i18n/detect-language')
        .send({
          text: 'こんにちは世界'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.language).toBe('ja');
      expect(translationService.detectLanguage).toHaveBeenCalledWith('こんにちは世界');
    });
    
    test('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/i18n/detect-language')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    test('should handle language detection errors', async () => {
      translationService.detectLanguage.mockRejectedValueOnce(new Error('Language detection error'));
      
      const response = await request(app)
        .post('/api/i18n/detect-language')
        .send({
          text: 'Hello world'
        });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('POST /api/i18n/clear-cache', () => {
    test('should clear the translation cache', async () => {
      const response = await request(app)
        .post('/api/i18n/clear-cache')
        .send({});
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(translationService.clearCache).toHaveBeenCalled();
    });
    
    test('should handle errors when clearing cache', async () => {
      translationService.clearCache.mockImplementationOnce(() => {
        throw new Error('Cache clearing error');
      });
      
      const response = await request(app)
        .post('/api/i18n/clear-cache')
        .send({});
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/i18n/translations', () => {
    test('should return 400 for unsupported language', async () => {
      const response = await request(app)
        .get('/api/i18n/translations')
        .query({ lang: 'de' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_LANGUAGE');
    });
  });

  describe('GET /api/i18n/translate/:key', () => {
    test('should return translation for valid key and language', async () => {
      const response = await request(app)
        .get('/api/i18n/translate/appTitle')
        .query({ lang: 'en' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.translation).toBe('Inventory Management System');
    });
    
    test('should return 400 for unsupported language on key translation', async () => {
      const response = await request(app)
        .get('/api/i18n/translate/appTitle')
        .query({ lang: 'it' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_LANGUAGE');
    });
  });
});
