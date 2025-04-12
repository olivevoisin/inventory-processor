/**
<<<<<<< HEAD
 * Error Handler Module
 * Custom error classes and error handling utilities
=======
 * Error handling utilities
>>>>>>> backup-main
 */
const logger = require('./logger');

/**
 * Base custom error class
 */
class AppError extends Error {
<<<<<<< HEAD
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.statusCode = status; // For compatibility
=======
  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
>>>>>>> backup-main
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
<<<<<<< HEAD
 * Error for invalid input data
=======
 * Validation error - thrown when request data is invalid
>>>>>>> backup-main
 */
class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 400);
    this.fields = fields;
  }
}

/**
<<<<<<< HEAD
 * Error for authentication failures
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
=======
 * Authentication error - thrown when authentication fails
 */
class AuthenticationError extends AppError {
  constructor(message) {
>>>>>>> backup-main
    super(message, 401);
  }
}

/**
<<<<<<< HEAD
 * Error for authorization failures
 */
class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
=======
 * Authorization error - thrown when user lacks permissions
 */
class AuthorizationError extends AppError {
  constructor(message) {
>>>>>>> backup-main
    super(message, 403);
  }
}

/**
<<<<<<< HEAD
 * Error for resource not found
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = '') {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, 404);
    this.resource = resource;
    this.resourceId = id;
=======
 * Not found error - thrown when resource is not found
 */
class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
>>>>>>> backup-main
  }
}

/**
<<<<<<< HEAD
 * Error for database operation failures
 */
class DatabaseError extends AppError {
=======
 * Conflict error - thrown when resource already exists
 */
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

/**
 * Rate limit error - thrown when request limit is exceeded
 */
class RateLimitError extends AppError {
  constructor(message) {
    super(message, 429);
  }
}

/**
 * External service error - thrown when external service fails
 */
class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(message, 502);
    this.service = service;
  }
}

/**
 * Internal error - thrown for unexpected server errors
 */
class InternalError extends AppError {
>>>>>>> backup-main
  constructor(message) {
    super(message, 500);
  }
}

/**
<<<<<<< HEAD
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
<<<<<<< HEAD
function errorMiddleware(err, req, res, next) {
  // Journaliser l'erreur
  logger.error(`${err.name}: ${err.message}`);
  
  if (err.stack) {
    logger.debug(err.stack);
=======
class APIError extends AppError {
  constructor(message, statusCode = 500) {
    super(message, statusCode);
>>>>>>> 886f868 (Push project copy to 28mars branch)
  }
}

/**
 * Handle error in async routes
 * @param {Function} fn - Async route handler
 * @returns {Function} - Express middleware function
=======
 * Create a ValidationError
 * @param {string} message - Error message
 * @param {Object} fields - Invalid fields details
 * @returns {ValidationError} Validation error
 */
function createValidationError(message, fields) {
  return new ValidationError(message, fields);
}

/**
 * Create an AuthenticationError
 * @param {string} message - Error message
 * @returns {AuthenticationError} Authentication error
 */
function createAuthenticationError(message) {
  return new AuthenticationError(message);
}

/**
 * Create an AuthorizationError
 * @param {string} message - Error message
 * @returns {AuthorizationError} Authorization error
 */
function createAuthorizationError(message) {
  return new AuthorizationError(message);
}

/**
 * Create a NotFoundError
 * @param {string} message - Error message
 * @returns {NotFoundError} Not found error
 */
function createNotFoundError(message) {
  return new NotFoundError(message);
}

/**
 * Create a ConflictError
 * @param {string} message - Error message
 * @returns {ConflictError} Conflict error
 */
function createConflictError(message) {
  return new ConflictError(message);
}

/**
 * Create a RateLimitError
 * @param {string} message - Error message
 * @returns {RateLimitError} Rate limit error
 */
function createRateLimitError(message) {
  return new RateLimitError(message);
}

/**
 * Create an ExternalServiceError
 * @param {string} service - Service name
 * @param {string} message - Error message
 * @returns {ExternalServiceError} External service error
 */
function createExternalServiceError(service, message) {
  return new ExternalServiceError(service, message);
}

/**
 * Create an InternalError
 * @param {string} message - Error message
 * @returns {InternalError} Internal error
 */
function createInternalError(message) {
  return new InternalError(message);
}

/**
 * Global error middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorMiddleware(err, req, res, next) {
  const statusCode = err.status || 500;
  const errorMessage = err.message || 'Internal server error';
  
  // Log error
  logger.error(`API Error: ${errorMessage}`, {
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: errorMessage
  });
}

/**
 * Async handler to wrap async route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware
>>>>>>> backup-main
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

<<<<<<< HEAD
<<<<<<< HEAD
// For backward compatibility
const globalErrorHandler = errorMiddleware;
=======
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
>>>>>>> 886f868 (Push project copy to 28mars branch)

module.exports = {
  AppError,
=======
module.exports = {
>>>>>>> backup-main
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
<<<<<<< HEAD
  DatabaseError,
  ExternalServiceError,
<<<<<<< HEAD
  errorMiddleware,
  globalErrorHandler,
  asyncHandler
=======
  APIError,
  asyncHandler,
  errorMiddleware,
  handleError,
  // Export this for testing
  globalErrorHandler: errorMiddleware
>>>>>>> 886f868 (Push project copy to 28mars branch)
=======
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  InternalError,
  
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createRateLimitError,
  createExternalServiceError,
  createInternalError,
  
  errorMiddleware,
  asyncHandler
>>>>>>> backup-main
};
