// middleware/common.js

const logger = require('../utils/logger');
const monitoring = require('../utils/monitoring');
const { ValidationError } = require('../utils/error-handler');

/**
 * Middleware to track API calls
 */
const trackApiCall = (req, res, next) => {
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  
  monitoring.trackApiCall(endpoint, method);
  
  // Add performance tracking
  req.startTime = Date.now();
  
  // Track response time on finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    monitoring.trackResponseTime(endpoint, duration);
    
    // Track errors for non-success status codes
    if (res.statusCode >= 400) {
      monitoring.trackError(endpoint, res.statusCode);
    }
  });
  
  next();
};

/**
 * Middleware to validate request payload against schema
 * @param {Function} validationFn - Validation function that returns errors
 */
const validateRequest = (validationFn) => {
  return (req, res, next) => {
    const errors = validationFn(req);
    
    if (errors && errors.length > 0) {
      const fields = errors.map(e => e.field);
      const message = errors.map(e => e.message).join(', ');
      
      next(new ValidationError(message, fields, 'VALIDATION_ERROR'));
    } else {
      next();
    }
  };
};

/**
 * Middleware to standardize successful responses
 */
const standardizeResponse = (req, res, next) => {
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
};

module.exports = {
  trackApiCall,
  validateRequest,
  standardizeResponse
};