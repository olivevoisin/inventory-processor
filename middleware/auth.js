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
<<<<<<< HEAD
function authenticateApiKey(req, res, next) {
  // Dans l'environnement de test, ignorer l'authentification
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  // Récupérer la clé API de l'en-tête
  const apiKey = req.headers['x-api-key'];
  
  // Clé API valide depuis l'environnement ou une valeur de test
  const validApiKey = process.env.API_KEY || 'test-api-key';
  
  // Vérifier si la clé est fournie
=======
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
  
>>>>>>> 886f868 (Push project copy to 28mars branch)
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
