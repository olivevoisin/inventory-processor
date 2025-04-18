const logger = require('./logger');

/**
 * Base class for custom application errors.
 */
class BaseError extends Error {
  constructor(message, status = 500, name = 'BaseError') {
    super(message);
    this.name = name;
    this.status = status;
    this.statusCode = status; // Common alias
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for validation failures (400).
 */
class ValidationError extends BaseError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'ValidationError');
  }
}

/**
 * Error for resource not found (404).
 */
class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NotFoundError');
  }
}

/**
 * Error for authentication failures (401).
 */
class AuthenticationError extends BaseError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AuthenticationError');
  }
}

/**
 * Error for authorization failures (403).
 */
class AuthorizationError extends BaseError {
  constructor(message = 'Authorization failed') {
    super(message, 403, 'AuthorizationError');
  }
}

/**
 * Error for external service failures (503).
 */
class ExternalServiceError extends BaseError {
  constructor(serviceName = 'External Service', message = 'An error occurred') {
    super(`${serviceName} Error: ${message}`, 503, 'ExternalServiceError');
    this.serviceName = serviceName;
  }
}

/**
 * Factory function to create a ValidationError.
 * @param {string} message - The error message.
 * @returns {ValidationError}
 */
function createValidationError(message) {
  return new ValidationError(message);
}

/**
 * Generic error handling middleware.
 * Logs the error and sends a standardized JSON response.
 * @param {Error} err - The error object.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
function handleError(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorName = err.name || 'Error';

  // Log the error details
  logger.error(`${errorName} (${status}): ${message}`, {
    path: req?.originalUrl || req?.url,
    method: req?.method,
    ip: req?.ip,
    // Avoid logging potentially large stack traces unless debugging
    // stack: err.stack
  });

  if (res.headersSent) {
    // If headers already sent, delegate to default Express handler
    return next(err);
  }

  // Send standardized error response
  res.status(status).json({
    success: false,
    error: message,
    code: errorName // Optionally include error code/name
  });
}

module.exports = {
  BaseError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ExternalServiceError,
  createValidationError,
  handleError,
  errorMiddleware: handleError, // Add this alias
};
