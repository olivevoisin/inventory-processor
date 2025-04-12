/**
 * Error handling utilities
 */
const logger = require('./logger');

/**
 * Base custom error class
 */
class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - thrown when request data is invalid
 */
class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 400);
    this.fields = fields;
  }
}

/**
 * Authentication error - thrown when authentication fails
 */
class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

/**
 * Authorization error - thrown when user lacks permissions
 */
class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403);
  }
}

/**
 * Not found error - thrown when resource is not found
 */
class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

/**
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
  constructor(message) {
    super(message, 500);
  }
}

/**
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
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
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
};
