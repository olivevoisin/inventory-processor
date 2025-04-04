/**
 * Retry utility for handling transient failures
 */

const logger = require('./logger');
const { ExternalServiceError } = require('./error-handler');

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - The function to retry
 * @param {Object} options - Options for retry mechanism
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 300)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 5000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable (default: all errors)
 * @param {string} options.serviceName - Name of the service being called (for logging)
 * @param {string} options.operationName - Name of the operation being performed (for logging)
 * @returns {Promise<any>} - Result of the function call
 */
async function retryOperation(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 300,
    maxDelay = 5000,
    shouldRetry = () => true,
    serviceName = 'unknown',
    operationName = 'operation'
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Start timer to measure execution time
      const timer = logger.startTimer();
      
      // Execute the function
      const result = await fn();
      
      // Log successful execution (only after retries)
      if (attempt > 0) {
        logger.info(`Successfully executed ${operationName} after ${attempt} retries`, {
          service: serviceName,
          duration: timer.end(),
          attempt
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      attempt++;
      
      // Check if we should retry this error
      if (attempt > maxRetries || !shouldRetry(error)) {
        // If we're out of retries or shouldn't retry this error, break out of the loop
        break;
      }
      
      // Calculate backoff delay with jitter
      const delay = Math.min(
        maxDelay,
        initialDelay * Math.pow(2, attempt - 1) * (0.9 + Math.random() * 0.2)
      );
      
      // Log retry attempt
      logger.warn(`Retry attempt ${attempt}/${maxRetries} for ${operationName}. Retrying in ${Math.round(delay)}ms`, {
        service: serviceName,
        errorMessage: error.message,
        attempt,
        delay: Math.round(delay)
      });
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, we've exhausted all retries or encountered a non-retryable error
  logger.error(`Failed ${operationName} after ${attempt - 1} retries`, {
    service: serviceName,
    errorMessage: lastError.message,
    stack: lastError.stack
  });
  
  // Wrap the original error in an ExternalServiceError for better handling
  throw new ExternalServiceError(
    `Failed to execute ${operationName} after ${attempt - 1} retries: ${lastError.message}`,
    serviceName,
    `${serviceName.toUpperCase()}_ERROR`,
    true,
    lastError.stack
  );
}

/**
 * Common retry predicates for different services
 */
const retryPredicates = {
  // Generic network errors that should be retried
  networkErrors: (error) => {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ESOCKETTIMEDOUT',
      'NETWORK_ERROR'
    ];
    
    return (
      error.code && retryableErrors.includes(error.code) ||
      error.message && /network|timeout|refused|reset/i.test(error.message)
    );
  },
  
  // HTTP status codes that typically indicate a transient error
  httpStatus: (error) => {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return error.statusCode && retryableStatusCodes.includes(error.statusCode);
  },
  
  // Google API specific errors
  googleApi: (error) => {
    // Check for rate limit errors or temporary server errors
    if (error.code === 429 || (error.code >= 500 && error.code < 600)) {
      return true;
    }
    
    // Check for quota errors
    if (error.message && /quota|limit|exceeded|temporary/i.test(error.message)) {
      return true;
    }
    
    // Fall back to network error check
    return retryPredicates.networkErrors(error);
  },
  
  // Deepgram specific errors
  deepgram: (error) => {
    // Check for Deepgram specific retryable errors
    if (error.type === 'DeepgramError' && 
        (error.message.includes('rate limit') || error.message.includes('server error'))) {
      return true;
    }
    
    // Fall back to HTTP status and network error checks
    return retryPredicates.httpStatus(error) || retryPredicates.networkErrors(error);
  },
  
  // Google Sheets API specific errors
  sheets: (error) => {
    // Check for sheet-specific retryable errors
    if (error.message && /user rate limit|quota|insufficient permissions/i.test(error.message)) {
      return true;
    }
    
    // Fall back to Google API error checks
    return retryPredicates.googleApi(error);
  }
};

module.exports = {
  retryOperation,
  retryPredicates
};