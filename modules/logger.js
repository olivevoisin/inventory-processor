require('dotenv').config(); // Load environment variables

/**
 * Logger Module
 * Provides logging functionalities
 */
const isDebugMode = process.env.DEBUG === 'true';
const isTestEnv = process.env.NODE_ENV === 'test';

function log(level, message, meta = {}) {
  if (isTestEnv) return; // Skip logging in test environment
  const formattedMessage = `[${level.toUpperCase()}] ${message}`;
  if (typeof console[level] === 'function') {
    console[level](formattedMessage, meta); // Ensure console method exists
  }
}

function info(message, meta = {}) {
  log('log', message, meta);
}

function error(message, meta = {}) {
  log('error', message, meta);
}

function warn(message, meta = {}) {
  log('warn', message, meta);
}

function debug(message, meta = {}) {
  if (isDebugMode) {
    log('debug', message, meta);
  }
}

module.exports = {
  info,
  error,
  warn,
  debug,
};
