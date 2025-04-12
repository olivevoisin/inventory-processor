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
  // For unit tests environment detection
  const isTest = process.env.NODE_ENV === 'test';
  
  // Get API key from header
  const apiKey = req.headers['x-api-key'];
  
  // Valid API key from environment or a test value
  const validApiKey = process.env.API_KEY || 'test-api-key';
  
  // Check if API key is provided
  if (!apiKey) {
    // Skip logging in test environment to avoid noise
    if (!isTest) {
      logger.warn('API request without API key');
    }
    
    res.status(401).json({
      success: false,
      error: 'API key required'
    });
    return; // Important: return here to prevent next() from being called
  }
  
  // Check if API key is valid
  if (apiKey !== validApiKey) {
    // Skip logging in test environment
    if (!isTest) {
      logger.warn(`API request with invalid API key: ${apiKey.substring(0, 5)}...`);
    }
    
    res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
    return; // Important: return here to prevent next() from being called
  }
  
  // API key is valid, proceed
  next();
}

module.exports = {
  authenticateApiKey
};
