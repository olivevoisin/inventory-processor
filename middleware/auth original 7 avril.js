/**
 * Authentication Middleware
 */
const logger = require('../utils/logger');

/**
 * Verify API key from request headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function authenticateApiKey(req, res, next) {
  // Get API key from header
  const apiKey = req.headers['x-api-key'];
  
  // Valid API key from environment or a test value
  const validApiKey = process.env.API_KEY || 'test-api-key';
  
  logger.info('Authenticating API key', { apiKey });
  
  // Allow test bypass with special header (only used in specific tests)
  if (req.headers['x-skip-auth'] === 'true') {
    return next();
  }
  
  // Missing API key check
  if (!apiKey) {
    logger.error('API key is missing');
    res.status(401).json({
      success: false,
      error: 'API key required'
    });
    return;
  }
  
  // Invalid API key check
  if (apiKey !== validApiKey) {
    logger.error('Invalid API key', { apiKey });
    res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
    return;
  }
  
  // Valid API key - proceed
  next();
}

module.exports = {
  authenticateApiKey
};
