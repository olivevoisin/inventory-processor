/**
<<<<<<< HEAD
 * Common middleware functions
 */
const logger = require('../utils/logger');
const monitoring = require('../utils/monitoring');
<<<<<<< HEAD
const helmet = require('helmet');
const cors = require('cors');
const express = require('express');
=======
const { ValidationError } = require('../utils/error-handler');
>>>>>>> 886f868 (Push project copy to 28mars branch)

/**
 * Middleware to track API calls
 */
function trackApiCall(req, res, next) {
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  
<<<<<<< HEAD
  // Enregistrer l'appel API
  monitoring.recordApiUsage(endpoint, method);
=======
  monitoring.recordApiUsage(endpoint);
>>>>>>> 886f868 (Push project copy to 28mars branch)
  
  // Add performance tracking
  req.startTime = Date.now();
  
  // Track response time on finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    monitoring.recordApiUsage(`${method} ${endpoint}`);
    
<<<<<<< HEAD
    // Enregistrer le temps de réponse
    monitoring.recordResponseTime(duration);
    
    // Journaliser l'appel API
    logger.info(`${method} ${endpoint} ${res.statusCode} (${duration}ms)`, {
      method,
      endpoint,
      statusCode: res.statusCode,
      duration
    });
    
    // Si c'est une erreur, la suivre
    if (res.statusCode >= 400) {
      monitoring.recordError(endpoint, res.statusCode);
=======
    // Track errors for non-success status codes
    if (res.statusCode >= 400) {
      monitoring.recordError(new Error(`HTTP ${res.statusCode}`), endpoint);
>>>>>>> 886f868 (Push project copy to 28mars branch)
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
<<<<<<< HEAD
 * Validation générique des requêtes
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
function validateRequest(req, res, next) {
  // En mode test, ignorer la validation sauf si explicitement demandé
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_VALIDATION) {
    return next();
  }
  
  // Vérifier le body pour les requêtes POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) {
    return res.status(400).json({
      success: false,
      error: 'Missing request body'
    });
  }
  
  // La validation est réussie
  next();
}

/**
 * Configure les middleware standard pour l'application
 * @param {Object} app - Application Express
 */
function setupMiddleware(app) {
  // Security middlewares
  app.use(helmet());
  app.use(cors());
  
  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Custom middlewares
  app.use(trackApiCall);
  app.use(standardizeResponse);
  app.use(validateRequest);
  
  return app;
=======
 * Set up all common middleware on an app
 * @param {Object} app - Express app
 */
function setupMiddleware(app) {
  app.use(trackApiCall);
  app.use(standardizeResponse);
>>>>>>> 886f868 (Push project copy to 28mars branch)
}

module.exports = {
  trackApiCall,
<<<<<<< HEAD
  standardizeResponse,
  validateRequest,
=======
  validateRequest,
  standardizeResponse,
>>>>>>> 886f868 (Push project copy to 28mars branch)
  setupMiddleware
};
=======
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
    monitoring.recordApiUsage(req.method, req.path || req.url, responseTime, res.statusCode);
    
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
>>>>>>> backup-main
