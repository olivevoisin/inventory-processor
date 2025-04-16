/**
 * Module de journalisation
 * Fournit des fonctions de journalisation pour l'application
 */

// Create logger that works with tests
const logger = {
  info: function(message, meta = {}) {
    console.log(`[INFO] ${message}`);
  },
  
  error: function(message, meta = {}) {
    console.error(`[ERROR] ${message}`);
  },
  
  warn: function(message, meta = {}) {
    console.warn(`[WARN] ${message}`);
  },
  
  debug: function(message, meta = {}) {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${message}`);
    }
  }
};

module.exports = logger;
