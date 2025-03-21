/**
 * Error Handler Module
 * Custom error classes and error handling utilities
 */

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
  constructor(service, message, errorCode = null) {
    super(`${service} service error: ${message}`, 502);
    this.service = service;
    this.errorCode = errorCode;
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

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  APIError,
  asyncHandler
};
