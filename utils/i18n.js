/**
 * Internationalization (i18n) utility for the inventory management system
 */

// Define available languages
const AVAILABLE_LANGUAGES = ['en', 'fr'];
const DEFAULT_LANGUAGE = 'en';

// Translations for different languages
const translations = {
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
    add: 'Add',
    search: 'Search',
    
    // Navigation
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    reports: 'Reports',
    settings: 'Settings',
    
    // Inventory
    inventoryItems: 'Inventory Items',
    productId: 'Product ID',
    productName: 'Product Name',
    quantity: 'Quantity',
    location: 'Location',
    dateAdded: 'Date Added',
    addItem: 'Add Item',
    editItem: 'Edit Item',
    deleteItem: 'Delete Item',
    
    // Voice processing
    voiceProcessing: 'Voice Processing',
    uploadVoice: 'Upload Voice Recording',
    processingVoice: 'Processing Voice Recording...',
    voiceProcessed: 'Voice Recording Processed Successfully',
    
    // Invoice processing
    invoiceProcessing: 'Invoice Processing',
    uploadInvoice: 'Upload Invoice',
    processingInvoice: 'Processing Invoice...',
    invoiceProcessed: 'Invoice Processed Successfully',
    
    // Messages
    confirmDelete: 'Are you sure you want to delete this item?',
    itemSaved: 'Item saved successfully',
    itemDeleted: 'Item deleted successfully'
  },
  fr: {
    // Général
    appTitle: 'Système de Gestion des Stocks',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    search: 'Rechercher',
    
    // Navigation
    dashboard: 'Tableau de Bord',
    inventory: 'Inventaire',
    reports: 'Rapports',
    settings: 'Paramètres',
    
    // Inventaire
    inventoryItems: 'Articles d\'Inventaire',
    productId: 'ID du Produit',
    productName: 'Nom du Produit',
    quantity: 'Quantité',
    location: 'Emplacement',
    dateAdded: 'Date d\'Ajout',
    addItem: 'Ajouter un Article',
    editItem: 'Modifier l\'Article',
    deleteItem: 'Supprimer l\'Article',
    
    // Traitement vocal
    voiceProcessing: 'Traitement Vocal',
    uploadVoice: 'Télécharger un Enregistrement Vocal',
    processingVoice: 'Traitement de l\'Enregistrement Vocal...',
    voiceProcessed: 'Enregistrement Vocal Traité avec Succès',
    
    // Traitement des factures
    invoiceProcessing: 'Traitement des Factures',
    uploadInvoice: 'Télécharger une Facture',
    processingInvoice: 'Traitement de la Facture...',
    invoiceProcessed: 'Facture Traitée avec Succès',
    
    // Messages
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer cet article?',
    itemSaved: 'Article enregistré avec succès',
    itemDeleted: 'Article supprimé avec succès'
  }
};

/**
 * Get the current language from browser or localStorage
 * @returns {string} - Language code (e.g., 'en', 'fr')
 */
function getCurrentLanguage() {
  // Try to get language from localStorage
  const storedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('language') : null;
  
  if (storedLang && AVAILABLE_LANGUAGES.includes(storedLang)) {
    return storedLang;
  }
  
  // Try to get from browser settings
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0];
    if (AVAILABLE_LANGUAGES.includes(browserLang)) {
      return browserLang;
    }
  }
  
  // Default language
  return DEFAULT_LANGUAGE;
}

/**
 * Set the current language
 * @param {string} lang - Language code to set
 * @returns {boolean} - True if successful, false otherwise
 */
function setLanguage(lang) {
  if (!AVAILABLE_LANGUAGES.includes(lang)) {
    return false;
  }
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('language', lang);
  }
  
  return true;
}

/**
 * Translate a key to the current language
 * @param {string} key - Translation key
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} - Translated text
 */
function translate(key, params = {}) {
  const lang = getCurrentLanguage();
  const langTranslations = translations[lang] || translations[DEFAULT_LANGUAGE];
  
  let text = langTranslations[key] || key;
  
  // Simple parameter interpolation
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
  });
  
  return text;
}

/**
 * Get all translations for the current language
 * @returns {Object} - All translations
 */
function getAllTranslations() {
  const lang = getCurrentLanguage();
  return { ...translations[DEFAULT_LANGUAGE], ...translations[lang] };
}

/**
 * Get available languages
 * @returns {Array} - Array of available language codes
 */
function getAvailableLanguages() {
  return AVAILABLE_LANGUAGES;
}

module.exports = {
  translate,
  setLanguage,
  getCurrentLanguage,
  getAllTranslations,
  getAvailableLanguages,
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE
};
