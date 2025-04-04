/**
 * Module de journalisation
 * Fournit des fonctions de journalisation pour l'application
 */
const consoleLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta);
};

const logger = {
  info: (message, meta) => consoleLog('log', message, meta),
  error: (message, meta) => consoleLog('error', message, meta),
  warn: (message, meta) => consoleLog('warn', message, meta),
  debug: (message, meta) => {
    if (process.env.DEBUG === 'true') {
      consoleLog('debug', message, meta);
    }
  }
};

module.exports = logger;
