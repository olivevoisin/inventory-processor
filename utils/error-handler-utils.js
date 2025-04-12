/**
 * Error Handler Utility
 * Provides custom error classes and error handling utilities
 */
const logger = require('./logger');

/**
 * Base custom error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for invalid input data
 */
class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 400);
    this.fields = fields;
  }
}

/**
 * Error for authentication failures
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

/**
 * Error for authorization failures
 */
class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403);
  }
}

/**
 * Error for resource not found
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = '') {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, 404);
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * Error for external service failures
 */
class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    super(`${service} service error: ${message}`, 502);
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Handle error in async routes
 * @param {Function} fn - Async route handler
 * @returns {Function} - Express middleware function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function globalErrorHandler(err, req, res, next) {
  // Skip logging in test environment unless specifically requested
  if (process.env.NODE_ENV !== 'test' || process.env.LOG_IN_TESTS) {
    logger.error(`${err.name || 'Error'}: ${err.message}`);
    
    if (err.stack) {
      logger.debug(err.stack);
    }
  }
  
  // Default error status and message
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Something went wrong';
  
  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message,
      type: err.name || 'Error'
    }
  };
  
  // Add validation errors if present
  if (err instanceof ValidationError && err.fields) {
    errorResponse.error.fields = err.fields;
  }
  
  // Hide stack trace in production
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ExternalServiceError,
  asyncHandler,
  globalErrorHandler
};
