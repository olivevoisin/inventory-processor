/**
 * Authentication middleware
 */
const { ValidationError } = require('../utils/error-handler');
const logger = require('../utils/logger');

/**
 * Middleware to validate API key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateApiKey(req, res, next) {
  // Use a fixed test API key in test environment
  const validApiKey = process.env.NODE_ENV === 'test' 
    ? 'test-api-key' 
    : (process.env.API_KEY || 'default-api-key');
  
  const apiKey = req.headers['x-api-key'];
  
  // For test environment, only skip validation if specifically indicated
  if (process.env.NODE_ENV === 'test' && process.env.SKIP_AUTH_VALIDATION === 'true') {
    return next();
  }
  
  if (!apiKey) {
    logger.warn('API request missing API key');
    return res.status(401).json({
      success: false,
      error: 'API key is required'
    });
  }
  
  if (apiKey !== validApiKey) {
    logger.warn(`Invalid API key provided: ${apiKey}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }
  
  next();
}

/**
 * Authenticate API key
 */
const authenticateApiKey = validateApiKey;

module.exports = {
  validateApiKey,
  authenticateApiKey
};
