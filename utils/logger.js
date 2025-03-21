/**
 * Logger module
 * Provides consistent logging throughout the application
 */

// Default log level for normal operation
const DEFAULT_LOG_LEVEL = 'info';

// Log levels and their priorities
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Create a variable we can modify in tests
let currentLogLevel = LOG_LEVELS[DEFAULT_LOG_LEVEL];

/**
 * Formats log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} - Formatted log message
 */
function formatLogMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Check if message should be logged based on current log level
 * @param {string} level - Log level
 * @returns {boolean} - Whether message should be logged
 */
function shouldLog(level) {
  return LOG_LEVELS[level] <= currentLogLevel;
}

/**
 * Set log level
 * @param {string} level - Log level name
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
  }
}

/**
 * Log error message
 * @param {string} message - Error message
 */
function error(message) {
  if (shouldLog('error')) {
    console.error(formatLogMessage('error', message));
  }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 */
function warn(message) {
  if (shouldLog('warn')) {
    console.warn(formatLogMessage('warn', message));
  }
}

/**
 * Log info message
 * @param {string} message - Info message
 */
function info(message) {
  if (shouldLog('info')) {
    console.log(formatLogMessage('info', message));
  }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 */
function debug(message) {
  if (shouldLog('debug')) {
    console.log(formatLogMessage('debug', message));
  }
}

/**
 * Log HTTP request
 * @param {string} message - HTTP request details
 */
function http(message) {
  if (shouldLog('http')) {
    console.log(formatLogMessage('http', message));
  }
}

/**
 * Log verbose message
 * @param {string} message - Verbose message
 */
function verbose(message) {
  if (shouldLog('verbose')) {
    console.log(formatLogMessage('verbose', message));
  }
}

module.exports = {
  error,
  warn,
  info,
  debug,
  http,
  verbose,
  setLogLevel,
  // For testing
  formatLogMessage,
  shouldLog,
  LOG_LEVELS,
  currentLogLevel
};
