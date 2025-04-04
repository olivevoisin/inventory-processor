/**
 * Routes pour l'internationalisation
 */
const express = require('express');
const router = express.Router();

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

module.exports = router;
