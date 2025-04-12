/**
 * Request validation middleware
 */
<<<<<<< HEAD
=======
const logger = require('../utils/logger');
>>>>>>> backup-main
const { ValidationError } = require('../utils/error-handler');

/**
 * Validate that request body contains all required fields
 * @param {Array} requiredFields - List of required fields
 * @returns {Function} Express middleware
 */
<<<<<<< HEAD
function validateRequestBody(requiredFields) {
  return (req, res, next) => {
<<<<<<< HEAD
    // Skip validation in test environment unless specifically required
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_VALIDATION) {
      return next();
    }
    
    // Vérifier si le body existe
    if (!req.body) {
      logger.warn('Requête sans body');
      return res.status(400).json({
        success: false,
        error: 'Missing request body'
      });
    }
=======
    const missingFields = requiredFields.filter(field => !req.body || req.body[field] === undefined);
>>>>>>> 886f868 (Push project copy to 28mars branch)
    
    if (missingFields.length > 0) {
<<<<<<< HEAD
      logger.warn(`Champs requis manquants: ${missingFields.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
=======
      const error = new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
      return next(error);
>>>>>>> 886f868 (Push project copy to 28mars branch)
    }
    
=======
function validateRequestBody(requiredFields = []) {
  return (req, res, next) => {
    // Skip validation in test environment unless explicitly testing it
    if (process.env.NODE_ENV === 'test' && process.env.TEST_VALIDATION !== 'true') {
      return next();
    }
    
    // Check if body exists
    if (!req.body) {
      const error = new ValidationError('Corps de requête manquant');
      logger.warn(`Validation error: ${error.message}`);
      return next(error);
    }
    
    // Check for missing fields
    const missingFields = requiredFields.filter(field => req.body[field] === undefined);
    
    if (missingFields.length > 0) {
      const error = new ValidationError(`Champs requis manquants: ${missingFields.join(', ')}`);
      logger.warn(`Validation error: ${error.message}`);
      return next(error);
    }
    
    // All fields are present
>>>>>>> backup-main
    next();
  };
}

/**
<<<<<<< HEAD
 * Validate that request query contains all required parameters
 * @param {Array} requiredParams - List of required parameters
 * @returns {Function} Express middleware
 */
function validateQueryParams(requiredParams) {
  return (req, res, next) => {
<<<<<<< HEAD
    // Skip validation in test environment unless specifically required
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_VALIDATION) {
      return next();
    }
    
    // Vérifier chaque paramètre requis
    const missingParams = [];
=======
    const missingParams = requiredParams.filter(param => !req.query || req.query[param] === undefined);
>>>>>>> 886f868 (Push project copy to 28mars branch)
    
    if (missingParams.length > 0) {
<<<<<<< HEAD
      logger.warn(`Paramètres requis manquants: ${missingParams.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`
      });
=======
      const error = new ValidationError(`Missing required query parameters: ${missingParams.join(', ')}`);
      return next(error);
>>>>>>> 886f868 (Push project copy to 28mars branch)
    }
    
=======
 * Validate that query contains all required parameters
 * @param {Array} requiredParams - List of required query parameters
 * @returns {Function} Express middleware
 */
function validateQueryParams(requiredParams = []) {
  return (req, res, next) => {
    // Skip validation in test environment unless explicitly testing it
    if (process.env.NODE_ENV === 'test' && process.env.TEST_VALIDATION !== 'true') {
      return next();
    }
    
    // Check for missing parameters
    const missingParams = requiredParams.filter(param => req.query[param] === undefined);
    
    if (missingParams.length > 0) {
      const error = new ValidationError(`Paramètres requis manquants: ${missingParams.join(', ')}`);
      logger.warn(`Validation error: ${error.message}`);
      return next(error);
    }
    
    // All parameters are present
>>>>>>> backup-main
    next();
  };
}

module.exports = {
  validateRequestBody,
  validateQueryParams
};
