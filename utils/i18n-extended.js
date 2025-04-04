/**
 * Module d'internationalisation étendu
 * Gère les traductions pour l'interface utilisateur et les messages système
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('../config');

// Langues disponibles
const AVAILABLE_LANGUAGES = config.i18n.availableLanguages || ['fr', 'en', 'ja'];
const DEFAULT_LANGUAGE = config.i18n.defaultLanguage || 'fr';

// Cache pour les traductions
let translations = {};

// Charger les traductions depuis les fichiers
function loadTranslations() {
  try {
    const translationsDir = path.join(__dirname, '../locales');
    
    // S'assurer que le dossier existe
    if (!fs.existsSync(translationsDir)) {
      fs.mkdirSync(translationsDir, { recursive: true });
      logger.warn(`Dossier de traductions créé: ${translationsDir}`);
    }
    
    // Charger chaque fichier de langue
    for (const lang of AVAILABLE_LANGUAGES) {
      const filePath = path.join(translationsDir, `${lang}.json`);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        translations[lang] = JSON.parse(content);
        logger.info(`Traductions chargées pour la langue: ${lang}`);
      } else {
        logger.warn(`Fichier de traduction manquant pour la langue: ${lang}`);
        translations[lang] = {};
      }
    }
    
    // S'assurer que toutes les langues ont au moins un objet vide
    AVAILABLE_LANGUAGES.forEach(lang => {
      if (!translations[lang]) {
        translations[lang] = {};
      }
    });
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors du chargement des traductions: ${error.message}`);
    return false;
  }
}

/**
 * Obtenir la langue actuelle
 * @param {Object} req - Requête Express (optionnelle)
 * @returns {string} - Code de langue
 */
function getCurrentLanguage(req) {
  if (req && req.query && req.query.lang && AVAILABLE_LANGUAGES.includes(req.query.lang)) {
    return req.query.lang;
  }
  
  if (req && req.headers && req.headers['accept-language']) {
    const acceptLanguage = req.headers['accept-language'].split(',')[0].trim().split('-')[0];
    if (AVAILABLE_LANGUAGES.includes(acceptLanguage)) {
      return acceptLanguage;
    }
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * Traduire une clé dans la langue spécifiée
 * @param {string} key - Clé de traduction
 * @param {Object} params - Paramètres pour interpolation
 * @param {string} lang - Code de langue (optionnel)
 * @returns {string} - Texte traduit
 */
function translate(key, params = {}, lang = DEFAULT_LANGUAGE) {
  // S'assurer que les traductions sont chargées
  if (Object.keys(translations).length === 0) {
    loadTranslations();
  }
  
  // Vérifier que la langue existe, sinon utiliser la langue par défaut
  const language = AVAILABLE_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  
  // Obtenir la traduction
  let translation = '';
  
  if (translations[language] && translations[language][key]) {
    translation = translations[language][key];
  } else if (translations[DEFAULT_LANGUAGE] && translations[DEFAULT_LANGUAGE][key]) {
    // Fallback à la langue par défaut
    translation = translations[DEFAULT_LANGUAGE][key];
    logger.debug(`Utilisation de la langue par défaut pour la clé: ${key}`);
  } else {
    // Aucune traduction trouvée, utiliser la clé
    translation = key;
    logger.debug(`Aucune traduction trouvée pour la clé: ${key}`);
  }
  
  // Interpolation des paramètres
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(param => {
      const regex = new RegExp(`{{\\s*${param}\\s*}}`, 'g');
      translation = translation.replace(regex, params[param]);
    });
  }
  
  return translation;
}

/**
 * Obtenir toutes les traductions pour une langue
 * @param {string} lang - Code de langue
 * @returns {Object} - Toutes les traductions
 */
function getAllTranslations(lang = DEFAULT_LANGUAGE) {
  // S'assurer que les traductions sont chargées
  if (Object.keys(translations).length === 0) {
    loadTranslations();
  }
  
  const language = AVAILABLE_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  
  return {
    ...translations[DEFAULT_LANGUAGE],
    ...translations[language]
  };
}

/**
 * Obtenir les langues disponibles
 * @returns {Array} - Langues disponibles
 */
function getAvailableLanguages() {
  return AVAILABLE_LANGUAGES;
}

/**
 * Ajouter ou mettre à jour une traduction
 * @param {string} lang - Code de langue
 * @param {string} key - Clé de traduction
 * @param {string} value - Valeur traduite
 * @returns {boolean} - Succès
 */
function setTranslation(lang, key, value) {
  if (!AVAILABLE_LANGUAGES.includes(lang)) {
    logger.error(`Langue non prise en charge: ${lang}`);
    return false;
  }
  
  try {
    // S'assurer que les traductions sont chargées
    if (Object.keys(translations).length === 0) {
      loadTranslations();
    }
    
    // Mettre à jour la traduction en mémoire
    if (!translations[lang]) {
      translations[lang] = {};
    }
    
    translations[lang][key] = value;
    
    // Sauvegarder dans le fichier
    const translationsDir = path.join(__dirname, '../locales');
    const filePath = path.join(translationsDir, `${lang}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(translations[lang], null, 2), 'utf8');
    
    logger.info(`Traduction mise à jour pour ${lang}.${key}`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la traduction: ${error.message}`);
    return false;
  }
}

// Charger les traductions au démarrage
loadTranslations();

module.exports = {
  translate,
  getCurrentLanguage,
  getAllTranslations,
  getAvailableLanguages,
  setTranslation,
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE
};
