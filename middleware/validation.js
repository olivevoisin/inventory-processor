/**
 * Middleware de validation des requêtes
 */
const logger = require('../utils/logger');

/**
 * Valide les champs requis dans le body de la requête
 * @param {Array<string>} requiredFields - Liste des champs requis
 * @returns {Function} - Middleware Express
 */
function validateRequestBody(requiredFields = []) {
  return (req, res, next) => {
    // Vérifier si le body existe
    if (!req.body) {
      logger.warn('Requête sans body');
      return res.status(400).json({
        success: false,
        error: 'Corps de requête vide'
      });
    }
    
    // Vérifier chaque champ requis
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (req.body[field] === undefined) {
        missingFields.push(field);
      }
    }
    
    // S'il manque des champs, renvoyer une erreur
    if (missingFields.length > 0) {
      logger.warn(`Champs requis manquants: ${missingFields.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: `Champs requis manquants: ${missingFields.join(', ')}`
      });
    }
    
    // Tous les champs sont présents, continuer
    next();
  };
}

/**
 * Valide les paramètres de requête
 * @param {Array<string>} requiredParams - Liste des paramètres requis
 * @returns {Function} - Middleware Express
 */
function validateQueryParams(requiredParams = []) {
  return (req, res, next) => {
    // Vérifier chaque paramètre requis
    const missingParams = [];
    
    for (const param of requiredParams) {
      if (req.query[param] === undefined) {
        missingParams.push(param);
      }
    }
    
    // S'il manque des paramètres, renvoyer une erreur
    if (missingParams.length > 0) {
      logger.warn(`Paramètres requis manquants: ${missingParams.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: `Paramètres requis manquants: ${missingParams.join(', ')}`
      });
    }
    
    // Tous les paramètres sont présents, continuer
    next();
  };
}

module.exports = {
  validateRequestBody,
  validateQueryParams
};
