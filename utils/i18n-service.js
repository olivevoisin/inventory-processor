/**
 * Service d'internationalisation (i18n)
 */
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Langue par défaut
const DEFAULT_LOCALE = 'fr';

// Chemins des fichiers de traduction
const TRANSLATIONS_DIR = path.join(__dirname, '../locales');

// Cache des traductions
const translations = {};

/**
 * Charge les traductions pour une langue
 * @param {string} locale - Code de langue (fr, en, etc.)
 * @returns {Object} - Traductions pour la langue
 */
function loadTranslations(locale) {
  try {
    // Vérifier si les traductions sont déjà en cache
    if (translations[locale]) {
      return translations[locale];
    }
    
    // Chemin du fichier de traduction
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      logger.warn(`Fichier de traduction non trouvé pour la langue: ${locale}`);
      return {};
    }
    
    // Lire et parser le fichier JSON
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Mettre en cache
    translations[locale] = parsed;
    
    return parsed;
  } catch (error) {
    logger.error(`Erreur lors du chargement des traductions pour ${locale}: ${error.message}`);
    return {};
  }
}

/**
 * Récupère la liste des langues disponibles
 * @returns {Array} - Liste des codes de langue disponibles
 */
function getAvailableLocales() {
  try {
    // Vérifier si le répertoire existe
    if (!fs.existsSync(TRANSLATIONS_DIR)) {
      logger.warn(`Répertoire de traductions non trouvé: ${TRANSLATIONS_DIR}`);
      return [DEFAULT_LOCALE];
    }
    
    // Lire le contenu du répertoire
    const files = fs.readdirSync(TRANSLATIONS_DIR);
    
    // Filtrer les fichiers JSON et extraire les codes de langue
    const locales = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    return locales.length > 0 ? locales : [DEFAULT_LOCALE];
  } catch (error) {
    logger.error(`Erreur lors de la récupération des langues disponibles: ${error.message}`);
    return [DEFAULT_LOCALE];
  }
}

/**
 * Vérifie si une langue est disponible
 * @param {string} locale - Code de langue à vérifier
 * @returns {boolean} - True si la langue est disponible
 */
function isLocaleAvailable(locale) {
  const availableLocales = getAvailableLocales();
  return availableLocales.includes(locale);
}

/**
 * Récupère la langue par défaut
 * @returns {string} - Code de langue par défaut
 */
function getDefaultLocale() {
  return DEFAULT_LOCALE;
}

/**
 * Récupère toutes les traductions pour une langue
 * @param {string} locale - Code de langue
 * @returns {Object} - Traductions pour la langue
 */
function getTranslations(locale) {
  // Si la langue n'est pas disponible, utiliser la langue par défaut
  if (!isLocaleAvailable(locale)) {
    logger.warn(`Langue non disponible: ${locale}, utilisation de la langue par défaut: ${DEFAULT_LOCALE}`);
    locale = DEFAULT_LOCALE;
  }
  
  return loadTranslations(locale);
}

/**
 * Traduit une clé dans la langue spécifiée
 * @param {string} key - Clé de traduction
 * @param {string} locale - Code de langue
 * @param {Object} params - Paramètres de substitution
 * @returns {string} - Texte traduit
 */
function translate(key, locale = DEFAULT_LOCALE, params = {}) {
  // Si la langue n'est pas disponible, utiliser la langue par défaut
  if (!isLocaleAvailable(locale)) {
    locale = DEFAULT_LOCALE;
  }
  
  // Charger les traductions
  const localeTranslations = loadTranslations(locale);
  
  // Récupérer la traduction
  let translation = localeTranslations[key];
  
  // Si pas de traduction, essayer avec la langue par défaut
  if (!translation && locale !== DEFAULT_LOCALE) {
    const defaultTranslations = loadTranslations(DEFAULT_LOCALE);
    translation = defaultTranslations[key];
  }
  
  // Si toujours pas de traduction, utiliser la clé
  if (!translation) {
    return key;
  }
  
  // Remplacer les paramètres
  if (params && Object.keys(params).length > 0) {
    Object.keys(params).forEach(param => {
      const regex = new RegExp(`{{\\s*${param}\\s*}}`, 'g');
      translation = translation.replace(regex, params[param]);
    });
  }
  
  return translation;
}

// Charger les traductions au démarrage
function init() {
  const availableLocales = getAvailableLocales();
  logger.info(`Initialisation du service i18n avec ${availableLocales.length} langues: ${availableLocales.join(', ')}`);
  
  // Précharger les traductions
  availableLocales.forEach(locale => {
    loadTranslations(locale);
  });
}

// Initialiser le service
init();

module.exports = {
  translate,
  getTranslations,
  getAvailableLocales,
  getDefaultLocale,
  isLocaleAvailable
};
