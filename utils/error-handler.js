/**
 * Error Handler Module
 * Custom error classes and error handling utilities
 */
const logger = require('./logger');

/**
 * Base custom error class
 */
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.statusCode = status; // For compatibility
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
 * Error for database operation failures
 */
class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500);
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
 * Error for API-related failures
 */
class APIError extends AppError {
  constructor(message, statusCode = 500) {
    super(message, statusCode);
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
function errorMiddleware(err, req, res, next) {
  // Log error details
  logger.error(`${err.name}: ${err.message}`);
  
  if (err.stack) {
    logger.debug(err.stack);
  }
  
  // Default error status and message
  const status = err.status || 500;
  const message = err.message || 'Something went wrong';
  
  // Send error response
  res.status(status).json({
    success: false,
    error: message
  });
}

/**
 * Main error handling function for easier testing
 */
function handleError(err, req, res) {
  const status = err.status || 500;
  const message = err.message || 'An error occurred';
  
  res.status(status).json({
    success: false,
    error: message
  });
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  APIError,
  asyncHandler,
  errorMiddleware,
  handleError,
  // Export this for testing
  globalErrorHandler: errorMiddleware
};
