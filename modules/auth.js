/**
 * Authentication Middleware
 * Handles API key authentication for inventory management system
 */
require('dotenv').config(); // Load environment variables
const config = require('../config');
const logger = require('../utils/logger');
const { AuthenticationError } = require('../utils/errors');

/**
 * Authenticate API key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = config.apiKey || process.env.API_KEY; // Use mock config during tests

  if (!apiKey) {
    const error = new AuthenticationError('API key is required');
    logger.error(error.message);
    res.status(401).json({ error: error.message });
    return;
  }

  if (apiKey !== expectedApiKey) {
    const error = new AuthenticationError('Invalid API key');
    logger.error(error.message);
    res.status(401).json({ error: error.message });
    return;
  }

  next();
}

module.exports = {
  authenticateApiKey,
};