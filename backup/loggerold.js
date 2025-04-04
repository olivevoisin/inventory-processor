// utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Create a logger instance for a specific module
 * @param {string} module - Module name
 * @returns {winston.Logger} Logger instance
 */
function createLogger(module) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: module },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      // File transport
      new winston.transports.File({
        filename: path.join(logDir, `${module}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });
}

module.exports = { createLogger };