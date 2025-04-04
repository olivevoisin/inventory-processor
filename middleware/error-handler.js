/**
 * Error handler middleware
 */
const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorMiddleware(err, req, res, next) {
  // Log the error
  logger.error(`${err.name}: ${err.message}`);
  
  if (err.stack) {
    logger.debug(err.stack);
  }
  
  // Set default error details
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message,
      type: err.name
    }
  };
  
  // Add validation errors if present
  if (err.fields) {
    errorResponse.error.fields = err.fields;
  }
  
  // Hide stack trace in production
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
  }
  
  // Handle specific error cases
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }
  
  // Send error response
  res.status(status).json(errorResponse);
}

module.exports = {
  errorMiddleware,
  errorHandler: errorMiddleware // For backward compatibility
};
