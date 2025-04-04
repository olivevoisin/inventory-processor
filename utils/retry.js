// utils/retry.js

const config = require('../config');
const logger = require('./logger');

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelay - Initial delay in ms
 * @param {number} options.maxDelay - Maximum delay in ms
 * @param {Function} options.onRetry - Called on each retry with (error, attempt)
 * @returns {Promise<any>} Result of the function
 */
async function retry(fn, options = {}) {
  const maxRetries = options.maxRetries || config.retries.maxRetries || 3;
  const initialDelay = options.initialDelay || config.retries.initialDelay || 300;
  const maxDelay = options.maxDelay || config.retries.maxDelay || 5000;
  const onRetry = options.onRetry || (() => {});
  
  let attempt = 0;
  let lastError = null;
  
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      lastError = error;
      
      // If we've used all retries, throw the error
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // Calculate backoff delay
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt - 1) + Math.random() * 100,
        maxDelay
      );
      
      // Call onRetry callback
      onRetry(error, attempt);
      
      // Log retry attempt
      logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
        module: 'retry',
        error: error.message,
        attempt,
        maxRetries,
        delay
      });
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should not be reached due to the error being thrown above,
  // but added for completeness
  throw lastError;
}

module.exports = {
  retry
};