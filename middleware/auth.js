/**
 * Middleware to validate API key
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }
    
    if (apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    next();
  }
  
  module.exports = {
    validateApiKey
  };