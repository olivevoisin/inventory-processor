/**
 * Common middleware functions for Express
 */
const logger = require('../utils/logger');
const monitoring = require('../utils/monitoring');

/**
 * Tracks API calls and logs them
 */
const trackApiCall = (req, res, next) => {
  // Record the start time for response time calculation
  req.startTime = Date.now();
  
  // Log the incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path || req.url,
    ip: req.ip
  });
  
  next();
};

/**
 * Validates the request body and parameters
 */
const validateRequest = (req, res, next) => {
  // Basic validation can go here
  // For now, just pass through
  next();
};

/**
 * Standardizes the response format and adds response time header
 */
const standardizeResponse = (req, res, next) => {
  // Save the original end method
  const originalEnd = res.end;
  
  // Override the end method
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Try to set the header, but only if headers haven't been sent yet
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${responseTime}ms`);
    }
    
    // Record API usage metrics
    monitoring.recordApiCall(req.path || req.url, res.statusCode, responseTime); // Fix: Changed recordApiUsage to recordApiCall and corrected parameter order
    
    // Call the original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error processing request', {
    error: err.message,
    stack: err.stack,
    path: req.path || req.url
  });
  
  // Record the error in monitoring
  monitoring.recordError(err, req);
  
  // Only respond if headers haven't been sent yet
  if (!res.headersSent) {
    // Handle different types of errors
    if (err.statusCode) {
      // API errors with status code
      return res.status(err.statusCode).json({
        success: false,
        error: err.message
      });
    } else if (err.name === 'ValidationError') {
      // Validation errors
      return res.status(400).json({
        success: false,
        error: err.message
      });
    } else {
      // Unknown errors
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error'
      });
    }
  }
  
  // If headers were already sent, just end the response
  if (next) {
    next(err);
  }
};

/**
 * Sets up all middleware for the Express application
 */
const setupMiddleware = (app) => {
  app.use(trackApiCall);
  app.use(validateRequest);
  app.use(standardizeResponse);
  
  // Error handler should be the last middleware
  app.use(errorHandler);
};

module.exports = {
  trackApiCall,
  validateRequest,
  standardizeResponse,
  errorHandler,
  setupMiddleware
};