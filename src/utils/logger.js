// projects/inventory-processor/src/utils/logger.js

/**
 * Simple logger utility for inventory processor
 */
const logger = {
    /**
     * Log info message
     * @param {string} message - Message to log
     */
    info: (message) => {
      console.log(`[INFO] [${new Date().toISOString()}] ${message}`);
    },
    
    /**
     * Log warning message
     * @param {string} message - Message to log
     */
    warn: (message) => {
      console.warn(`[WARN] [${new Date().toISOString()}] ${message}`);
    },
    
    /**
     * Log error message
     * @param {string} message - Message to log
     */
    error: (message) => {
      console.error(`[ERROR] [${new Date().toISOString()}] ${message}`);
    },
    
    /**
     * Log debug message (only in development)
     * @param {string} message - Message to log
     */
    debug: (message) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`);
      }
    }
  };
  
  module.exports = logger;