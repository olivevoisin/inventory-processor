// utils/logger.js

/**
 * Simple logger implementation
 */
const logger = {
  info: (message) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
    }
  },
  
  error: (message) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    }
  },
  
  warn: (message) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[${new Date().toISOString()}] [WARN] ${message}`);
    }
  },
  
  debug: (message) => {
    if (process.env.NODE_ENV !== 'test' && process.env.DEBUG === 'true') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`);
    }
  }
};

module.exports = logger;
