/**
 * Common middleware functions
 */
const logger = require('../utils/logger');
const monitoring = require('../utils/monitoring');
const { ValidationError } = require('../utils/error-handler');

/**
 * Middleware to track API calls
 */
function trackApiCall(req, res, next) {
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  
  monitoring.recordApiUsage(endpoint);
  
  // Add performance tracking
  req.startTime = Date.now();
  
  // Track response time on finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    monitoring.recordApiUsage(`${method} ${endpoint}`);
    
    // Track errors for non-success status codes
    if (res.statusCode >= 400) {
      monitoring.recordError(new Error(`HTTP ${res.statusCode}`), endpoint);
    }
  });
  
  next();
}

/**
 * Middleware to validate request payload against schema
 * @param {Function} validationFn - Validation function that returns errors
 */
function validateRequest(validationFn) {
  return (req, res, next) => {
    const errors = validationFn(req);
    
    if (errors && errors.length > 0) {
      const fields = errors.reduce((acc, e) => {
        acc[e.field] = e.message;
        return acc;
      }, {});
      
      const message = errors.map(e => e.message).join(', ');
      
      next(new ValidationError(message, fields));
    } else {
      next();
    }
  };
}

/**
 * Middleware to standardize successful responses
 */
function standardizeResponse(req, res, next) {
  // Store the original json method
  const originalJson = res.json;
  
  // Override the json method
  res.json = function(data) {
    // If the response is already in the standard format, don't modify it
    if (data && (data.success !== undefined || data.status !== undefined)) {
      return originalJson.call(this, data);
    }
    
    // Standardize the response format
    const standardResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };
    
    // Call the original json method with the standardized response
    return originalJson.call(this, standardResponse);
  };
  
  next();
}

/**
 * Set up all common middleware on an app
 * @param {Object} app - Express app
 */
function setupMiddleware(app) {
  app.use(trackApiCall);
  app.use(standardizeResponse);
}

module.exports = {
  trackApiCall,
  validateRequest,
  standardizeResponse,
  setupMiddleware
};
