/**
 * Request validation middleware
 */
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/error-handler');

/**
 * Validate that request body contains all required fields
 * @param {Array} requiredFields - List of required fields
 * @returns {Function} Express middleware
 */
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
    next();
  };
}

/**
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
    next();
  };
}

module.exports = {
  validateRequestBody,
  validateQueryParams
};
