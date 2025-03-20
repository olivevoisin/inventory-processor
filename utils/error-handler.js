/**
 * Custom error classes for better error handling and categorization
 */

// Base error class for application errors
class AppError extends Error {
    constructor(message, statusCode, errorCode, isOperational = true, stack = '') {
      super(message);
      this.statusCode = statusCode || 500;
      this.errorCode = errorCode || 'INTERNAL_ERROR';
      this.isOperational = isOperational; // Operational errors are expected errors
      
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  // API related errors
  class APIError extends AppError {
    constructor(message, statusCode = 500, errorCode = 'API_ERROR', isOperational = true, stack = '') {
      super(message, statusCode, errorCode, isOperational, stack);
    }
  }
  
  // Validation errors
  class ValidationError extends AppError {
    constructor(message, fields = [], errorCode = 'VALIDATION_ERROR', stack = '') {
      super(message, 400, errorCode, true, stack);
      this.fields = fields; // Fields that failed validation
    }
  }
  
  // Database errors
  class DatabaseError extends AppError {
    constructor(message, operation = '', errorCode = 'DATABASE_ERROR', isOperational = true, stack = '') {
      super(message, 500, errorCode, isOperational, stack);
      this.operation = operation;
    }
  }
  
  // External service errors (for Deepgram, Google Translate, etc.)
  class ExternalServiceError extends AppError {
    constructor(message, service = '', errorCode = 'EXTERNAL_SERVICE_ERROR', isOperational = true, stack = '') {
      super(message, 503, errorCode, isOperational, stack);
      this.service = service;
    }
  }
  
  // Global error handler function for Express
  const globalErrorHandler = (err, req, res, next) => {
    const logger = require('./logger');
    
    
    
    // Default values
    const statusCode = err.statusCode || 500;
    const errorCode = err.errorCode || 'INTERNAL_ERROR';
    
    // Define error response
    const errorResponse = {
        success: false,
        error: {
          code: errorCode,
          message: err.message || 'Something went wrong',
          requestId: req.requestId || 'unknown',
        },
        timestamp: new Date().toISOString()
      };
    
    // Add validation fields if available
    if (err instanceof ValidationError && err.fields) {
        errorResponse.error.fields = err.fields;
      }
      
    // Add service name if external service error
    if (err instanceof ExternalServiceError && err.service) {
      errorResponse.service = err.service;
    }
    
      // Add operation if database error
      if (err instanceof DatabaseError && err.operation) {
        errorResponse.error.operation = err.operation;
      }
    
    // Log error details
    if (statusCode >= 500) {
        logger.error(`[${errorCode}] ${err.message}`, {
          stack: err.stack,
          statusCode,
          isOperational: err.isOperational,
          requestId: req.requestId,
          requestPath: req.originalUrl,
          requestMethod: req.method
        });
      } else {
        logger.warn(`[${errorCode}] ${err.message}`, {
          statusCode,
          requestId: req.requestId,
          requestPath: req.originalUrl,
          requestMethod: req.method
        });
      }
    
    // Send error response
    res.status(statusCode).json(errorResponse);
  };
  
  // Async handler to avoid try/catch blocks in route handlers
  const asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  
  module.exports = {
    AppError,
    APIError,
    ValidationError,
    DatabaseError,
    ExternalServiceError,
    globalErrorHandler,
    asyncHandler
  };
  