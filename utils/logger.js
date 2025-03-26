/**
 * Logger Module
 * Provides logging functionality
 */

/**
 * Simple logger implementation with test environment detection
 */
const logger = {
  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {Object} meta - Optional metadata
   */
  info: (message, meta = {}) => {
    // Skip logging in test environment unless specifically requested
    if (process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS) {
      return;
    }
    const logMessage = `[${new Date().toISOString()}] [INFO] ${message}`;
    console.log(logMessage, Object.keys(meta).length > 0 ? meta : '');
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Object} meta - Optional metadata
   */
  error: (message, meta = {}) => {
    // Skip logging in test environment unless specifically requested
    if (process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS) {
      return;
    }
    const logMessage = `[${new Date().toISOString()}] [ERROR] ${message}`;
    console.error(logMessage, Object.keys(meta).length > 0 ? meta : '');
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {Object} meta - Optional metadata
   */
  warn: (message, meta = {}) => {
    // Skip logging in test environment unless specifically requested
    if (process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS) {
      return;
    }
    const logMessage = `[${new Date().toISOString()}] [WARN] ${message}`;
    console.warn(logMessage, Object.keys(meta).length > 0 ? meta : '');
  },

  /**
   * Log debug message
   * @param {string} message - Message to log
   * @param {Object} meta - Optional metadata
   */
  debug: (message, meta = {}) => {
    // Skip logging in test environment unless specifically requested
    if (process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS) {
      return;
    }
    // Only log debug messages if DEBUG environment variable is set
    if (process.env.DEBUG === 'true') {
      const logMessage = `[${new Date().toISOString()}] [DEBUG] ${message}`;
      console.debug(logMessage, Object.keys(meta).length > 0 ? meta : '');
    }
  },

  /**
   * For Express logging stream compatibility
   */
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
};

module.exports = logger;
