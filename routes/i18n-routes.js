/**
 * Routes pour l'internationalisation
 */
const express = require('express');
const router = express.Router();
<<<<<<< HEAD
=======
const translationService = require('../modules/translation-service');
const logger = require('../utils/logger');
const { authenticateApiKey } = require('../middleware/auth');
>>>>>>> backup-main

// Langues disponibles
const AVAILABLE_LANGUAGES = ['fr', 'en'];
const DEFAULT_LANGUAGE = 'fr';

// Traductions pour différentes langues
const translations = {
  fr: {
    // Général
    appTitle: 'Système de Gestion d\'Inventaire',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    
    // Navigation
    dashboard: 'Tableau de bord',
    inventory: 'Inventaire',
    voice: 'Dictée Vocale',
    invoices: 'Factures',
    settings: 'Paramètres',
    
    // Inventaire
    products: 'Produits',
    locations: 'Emplacements',
    history: 'Historique',
    addProduct: 'Ajouter un produit',
    
    // Messages
    noItemsFound: 'Aucun élément trouvé',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer cet élément ?'
  },
  en: {
    // General
    appTitle: 'Inventory Management System',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    
    // Navigation
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    voice: 'Voice Input',
    invoices: 'Invoices',
    settings: 'Settings',
    
    // Inventory
    products: 'Products',
    locations: 'Locations',
    history: 'History',
    addProduct: 'Add Product',
    
    // Messages
    noItemsFound: 'No items found',
    confirmDelete: 'Are you sure you want to delete this item?'
  }
};

/**
 * @route GET /api/i18n/translations
 * @desc Récupère toutes les traductions pour une langue spécifique
 * @access Public
 */
router.get('/translations', (req, res) => {
  try {
    const lang = req.query.lang || DEFAULT_LANGUAGE;
    
    // Valider la langue
    if (!AVAILABLE_LANGUAGES.includes(lang)) {
      return res.status(400).json({
        success: false,
        message: `Langue non prise en charge: ${lang}`,
        error: 'INVALID_LANGUAGE'
      });
    }
    
    // Récupérer toutes les traductions pour la langue demandée
    const langTranslations = translations[lang] || translations[DEFAULT_LANGUAGE];
    
    return res.status(200).json({
      success: true,
      language: lang,
      translations: langTranslations
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération des traductions: ${error.message}`,
      error: 'TRANSLATION_ERROR'
    });
  }
});

/**
 * @route GET /api/i18n/languages
 * @desc Récupère les langues disponibles
 * @access Public
 */
router.get('/languages', (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      languages: AVAILABLE_LANGUAGES,
      default: DEFAULT_LANGUAGE
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Erreur lors de la récupération des langues: ${error.message}`,
      error: 'LANGUAGE_ERROR'
    });
  }
});

/**
 * @route GET /api/i18n/translate/:key
 * @desc Traduit une clé spécifique
 * @access Public
 */
router.get('/translate/:key', (req, res) => {
  try {
    const { key } = req.params;
    const lang = req.query.lang || DEFAULT_LANGUAGE;
    
    // Valider la langue
    if (!AVAILABLE_LANGUAGES.includes(lang)) {
      return res.status(400).json({
        success: false,
        message: `Langue non prise en charge: ${lang}`,
        error: 'INVALID_LANGUAGE'
      });
    }
    
    // Récupérer la traduction
    const langTranslations = translations[lang] || translations[DEFAULT_LANGUAGE];
    const translation = langTranslations[key] || key;
    
    return res.status(200).json({
      success: true,
      key,
      language: lang,
      translation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Erreur lors de la traduction: ${error.message}`,
      error: 'TRANSLATION_ERROR'
    });
  }
});

<<<<<<< HEAD
module.exports = router;
=======
/**
 * Translate text from source to target language
 * POST /api/i18n/translate
 */
router.post('/translate', authenticateApiKey, async (req, res) => {
  try {
    const { text, source, target } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text to translate is required'
      });
    }
    
    if (!target) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required'
      });
    }
    
    // Auto-detect source language if not provided
    let sourceLanguage = source;
    if (!sourceLanguage) {
      sourceLanguage = await translationService.detectLanguage(text);
      logger.info(`Detected language: ${sourceLanguage} for text: ${text.substring(0, 20)}...`);
    }
    
    const translated = await translationService.translate(text, sourceLanguage, target);
    
    return res.status(200).json({
      success: true,
      original: text,
      translated,
      source: sourceLanguage,
      target
    });
  } catch (error) {
    logger.error(`Translation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Translation failed',
      details: error.message
    });
  }
});

/**
 * Batch translate array of texts
 * POST /api/i18n/batch-translate
 */
router.post('/batch-translate', authenticateApiKey, async (req, res) => {
  try {
    const { texts, source, target } = req.body;
    
    if (!texts) {
      return res.status(400).json({
        success: false,
        error: 'Texts to translate are required'
      });
    }
    
    if (!Array.isArray(texts)) {
      return res.status(400).json({
        success: false,
        error: 'Texts must be an array'
      });
    }
    
    if (!target) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required'
      });
    }
    
    // Auto-detect source language from first text if not provided
    let sourceLanguage = source;
    if (!sourceLanguage && texts.length > 0) {
      sourceLanguage = await translationService.detectLanguage(texts[0]);
      logger.info(`Detected language: ${sourceLanguage} for batch of ${texts.length} texts`);
    }
    
    const translated = await translationService.batchTranslate(texts, sourceLanguage, target);
    
    return res.status(200).json({
      success: true,
      original: texts,
      translated,
      source: sourceLanguage,
      target
    });
  } catch (error) {
    logger.error(`Batch translation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Batch translation failed',
      details: error.message
    });
  }
});

/**
 * Detect language of text
 * POST /api/i18n/detect-language
 */
router.post('/detect-language', authenticateApiKey, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    const language = await translationService.detectLanguage(text);
    
    return res.status(200).json({
      success: true,
      text,
      language
    });
  } catch (error) {
    logger.error(`Language detection error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Language detection failed',
      details: error.message
    });
  }
});

/**
 * Clear translation cache
 * POST /api/i18n/clear-cache
 */
router.post('/clear-cache', authenticateApiKey, (req, res) => {
  try {
    translationService.clearCache();
    
    logger.info('Translation cache cleared');
    
    return res.status(200).json({
      success: true,
      message: 'Translation cache cleared'
    });
  } catch (error) {
    logger.error(`Error clearing translation cache: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear translation cache',
      details: error.message
    });
  }
});

// Export router and variables for testing
module.exports = router;
// Export these for testing purposes
module.exports.AVAILABLE_LANGUAGES = AVAILABLE_LANGUAGES;
module.exports.DEFAULT_LANGUAGE = DEFAULT_LANGUAGE;
module.exports.translations = translations;
>>>>>>> backup-main
