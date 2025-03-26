/**
 * Module de surveillance du système
 * Fournit des fonctionnalités pour surveiller l'état et les performances de l'application
 */
const os = require('os');
const logger = require('./logger');

// Compteurs d'utilisation
let apiCalls = {};
let errorCounts = {};
let startTime = Date.now();

/**
 * Enregistre un appel API
 * @param {string} endpoint - Point de terminaison API
 * @param {string} method - Méthode HTTP
 */
function trackApiCall(endpoint, method = 'GET') {
  const key = `${method.toUpperCase()} ${endpoint}`;
  
  if (!apiCalls[key]) {
    apiCalls[key] = 0;
  }
  
  apiCalls[key]++;
}

/**
 * Enregistre une erreur
 * @param {string} endpoint - Point de terminaison où l'erreur s'est produite
 * @param {number} statusCode - Code d'état HTTP de l'erreur
 */
function trackError(endpoint, statusCode) {
  const key = `${endpoint}_${statusCode}`;
  
  if (!errorCounts[key]) {
    errorCounts[key] = 0;
  }
  
  errorCounts[key]++;
}

/**
 * Récupère des informations sur l'état du système
 * @returns {Object} - Informations d'état du système
 */
function getSystemHealth() {
  // Calculer le temps d'activité
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  // Récupérer l'utilisation de la mémoire
  const memory = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem(),
    usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1)
  };
  
  // Récupérer l'utilisation du CPU
  const cpuLoad = os.loadavg()[0];
  
  // Compter les appels API totaux
  const apiCallsTotal = Object.values(apiCalls).reduce((sum, count) => sum + count, 0);
  
  // Compter les erreurs totales
  const errorsTotal = Object.values(errorCounts).reduce((sum, count) => sum + count, 0);
  
  // Calculer le taux d'erreurs
  const errorRate = apiCallsTotal > 0 ? (errorsTotal / apiCallsTotal) : 0;
  
  return {
    status: errorRate > 0.1 ? 'degraded' : 'healthy',
    uptime,
    memory,
    cpu: {
      load: cpuLoad,
      cores: os.cpus().length
    },
    api: {
      calls: apiCalls,
      callsTotal: apiCallsTotal,
      errors: errorCounts,
      errorsTotal,
      errorRate
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Réinitialise les compteurs de surveillance
 */
function resetStats() {
  apiCalls = {};
  errorCounts = {};
  startTime = Date.now();
}

/**
 * Arrête le monitoring
 */
function shutdown() {
  logger.info('Arrêt du module de surveillance');
  // Aucune action nécessaire pour le moment
  // Ce serait utile s'il y avait des intervalles à effacer
}

module.exports = {
  trackApiCall,
  trackError,
  getSystemHealth,
  resetStats,
  shutdown
};
