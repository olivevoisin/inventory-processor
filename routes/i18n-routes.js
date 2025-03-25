/**
 * Routes for internationalization support
 */

const express = require('express');
const { 
  translate, 
  getAllTranslations, 
  getAvailableLanguages,
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE
} = require('../utils/i18n');

const router = express.Router();

// Get all translations for a specific language
router.get('/translations', (req, res) => {
  try {
    const lang = req.query.lang || DEFAULT_LANGUAGE;
    
    // Validate language
    if (!AVAILABLE_LANGUAGES.includes(lang)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported language: ${lang}`,
        error: 'INVALID_LANGUAGE'
      });
    }
    
    // Get all translations for the requested language
    const translations = getAllTranslations();
    
    return res.status(200).json({
      success: true,
      language: lang,
      translations
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error fetching translations: ${error.message}`,
      error: 'TRANSLATION_ERROR'
    });
  }
});

// Get available languages
router.get('/languages', (req, res) => {
  try {
    const languages = getAvailableLanguages();
    
    return res.status(200).json({
      success: true,
      languages,
      default: DEFAULT_LANGUAGE
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error fetching languages: ${error.message}`,
      error: 'LANGUAGE_ERROR'
    });
  }
});

// Translate a specific key
router.get('/translate/:key', (req, res) => {
  try {
    const { key } = req.params;
    const lang = req.query.lang || DEFAULT_LANGUAGE;
    const params = req.query.params ? JSON.parse(req.query.params) : {};
    
    // Validate language
    if (!AVAILABLE_LANGUAGES.includes(lang)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported language: ${lang}`,
        error: 'INVALID_LANGUAGE'
      });
    }
    
    // Translate the key
    const translation = translate(key, params);
    
    return res.status(200).json({
      success: true,
      key,
      language: lang,
      translation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error translating key: ${error.message}`,
      error: 'TRANSLATION_ERROR'
    });
  }
});

module.exports = router;
