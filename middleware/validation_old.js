/**
 * Request validation middleware
 */
const { ValidationError } = require('../utils/error-handler');

/**
 * Validate that request body contains all required fields
 * @param {Array} requiredFields - List of required fields
 * @returns {Function} Express middleware
 */
function validateRequestBody(requiredFields) {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body || req.body[field] === undefined);
    
    if (missingFields.length > 0) {
      const error = new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
      return next(error);
    }
    
    next();
  };
}

/**
 * Validate that request query contains all required parameters
 * @param {Array} requiredParams - List of required parameters
 * @returns {Function} Express middleware
 */
function validateQueryParams(requiredParams) {
  return (req, res, next) => {
    const missingParams = requiredParams.filter(param => !req.query || req.query[param] === undefined);
    
    if (missingParams.length > 0) {
      const error = new ValidationError(`Missing required query parameters: ${missingParams.join(', ')}`);
      return next(error);
    }
    
    next();
  };
}

module.exports = {
  validateRequestBody,
  validateQueryParams
};
