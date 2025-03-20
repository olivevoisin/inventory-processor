/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
    // Log the error
    console.error('Error:', err);
    
    // Set default error details
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    // Handle specific error cases
    if (err.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        error: `File upload error: ${err.message}`
      });
    }
    
    // Send error response
    res.status(status).json({
      success: false,
      error: message
    });
  }
  
  module.exports = {
    errorHandler
  };
  