/**
 * System monitoring utilities
 */
const os = require('os');
const logger = require('./logger');

<<<<<<< HEAD
<<<<<<< HEAD
// Compteurs d'utilisation
let apiCalls = {};
let errors = {};
let startTime = Date.now();
let responseTimes = [];
const MAX_RESPONSE_TIMES = 1000;
=======
=======
>>>>>>> backup-main
// Metrics collection
const metrics = {
  apiCalls: {},
  errors: {},
  startTime: Date.now(),
  lastResetTime: Date.now(),
  responseTimes: []
};
<<<<<<< HEAD
>>>>>>> 886f868 (Push project copy to 28mars branch)
=======
>>>>>>> backup-main

/**
 * Record API endpoint usage
 * @param {string} endpoint - API endpoint name
 */
<<<<<<< HEAD
<<<<<<< HEAD
function recordApiUsage(endpoint, method = 'GET') {
  const key = endpoint;
  
  if (!apiCalls[key]) {
    apiCalls[key] = 0;
=======
function recordApiUsage(endpoint) {
  if (!metrics.apiCalls[endpoint]) {
    metrics.apiCalls[endpoint] = 0;
>>>>>>> 886f868 (Push project copy to 28mars branch)
=======
function recordApiUsage(endpoint) {
  if (!metrics.apiCalls[endpoint]) {
    metrics.apiCalls[endpoint] = 0;
>>>>>>> backup-main
  }
  metrics.apiCalls[endpoint]++;
}

/**
<<<<<<< HEAD
<<<<<<< HEAD
 * Enregistre une erreur
 * @param {Error|string} error - Erreur à enregistrer
 * @param {string} source - Source de l'erreur (optionnel)
 */
function recordError(error, source = 'unknown') {
  let errorType = 'UnknownError';
  
  if (error instanceof Error) {
    errorType = error.constructor.name;
  } else if (typeof error === 'string') {
    errorType = 'UnknownError';
=======
=======
>>>>>>> backup-main
 * Record error occurrence
 * @param {Error} error - Error object
 * @param {string} source - Error source
 */
function recordError(error, source = 'unknown') {
  const errorType = error.name || 'UnknownError';
  const errorSource = source || error.source || 'unknown';
  
  const key = `${errorSource}:${errorType}`;
  
  if (!metrics.errors[key]) {
    metrics.errors[key] = 0;
<<<<<<< HEAD
>>>>>>> 886f868 (Push project copy to 28mars branch)
  }
  metrics.errors[key]++;
  
<<<<<<< HEAD
  const key = `${source}:${errorType}`;
  
  if (!errors[key]) {
    errors[key] = 0;
  }
  
  errors[key]++;
}

/**
 * Enregistre le temps de réponse
 * @param {number} time - Temps de réponse en ms
 */
function recordResponseTime(time) {
  // Ajouter le temps à la liste tout en respectant la taille maximale
  responseTimes.push(time);
  if (responseTimes.length > MAX_RESPONSE_TIMES) {
    responseTimes.shift(); // Supprimer l'élément le plus ancien
  }
}

/**
 * Récupère les métriques du système
 * @returns {Object} - Métriques collectées
 */
function getMetrics() {
  // Calculer le temps d'activité
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  // Calculer le temps de réponse moyen
  const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
  const avgResponseTime = responseTimes.length > 0 ? totalResponseTime / responseTimes.length : 0;
  
  // Compter les appels API totaux
  const apiCallsTotal = Object.values(apiCalls).reduce((sum, count) => sum + count, 0);
  
  // Compter les erreurs totales
  const errorsTotal = Object.values(errors).reduce((sum, count) => sum + count, 0);
  
  // Calculer le taux d'erreurs
  const errorRate = apiCallsTotal > 0 ? (errorsTotal / apiCallsTotal) : 0;
  
  return {
    uptime,
    apiCalls,
    apiCallsTotal,
    errors,
    errorsTotal,
    errorRate,
    avgResponseTime
  };
=======
  logger.error(`Error in ${errorSource}: ${error.message}`);
>>>>>>> 886f868 (Push project copy to 28mars branch)
=======
  }
  metrics.errors[key]++;
  
  logger.error(`Error in ${errorSource}: ${error.message}`);
>>>>>>> backup-main
}

/**
 * Record API response time
 * @param {number} responseTime - Response time in ms
 */
function recordResponseTime(responseTime) {
  metrics.responseTimes.push(responseTime);
  
  // Keep only the last 1000 response times
  if (metrics.responseTimes.length > 1000) {
    metrics.responseTimes.shift();
  }
}

/**
 * Get current metrics
 * @returns {Object} - Current metrics
 */
function getMetrics() {
  const totalApiCalls = Object.values(metrics.apiCalls).reduce((sum, count) => sum + count, 0);
  const totalErrors = Object.values(metrics.errors).reduce((sum, count) => sum + count, 0);
  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length
    : 0;
  
  return {
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    apiCallsTotal: totalApiCalls,
    errorsTotal: totalErrors,
    errorRate: totalApiCalls > 0 ? totalErrors / totalApiCalls : 0,
    avgResponseTime: avgResponseTime,
    apiCalls: { ...metrics.apiCalls },
    errors: { ...metrics.errors }
  };
}

/**
 * Get system health information
 * @returns {Object} - Health information
 */
function getSystemHealth() {
  const uptime = process.uptime();
  const memory = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem()
  };
<<<<<<< HEAD
<<<<<<< HEAD
  
  // Récupérer l'utilisation du CPU
  const cpu = os.loadavg()[0]; // Changed to number to match test expectation
  
  // Obtenir les métriques
  const metrics = getMetrics();
  
  return {
    status: metrics.errorRate > 0.1 ? 'degraded' : 'healthy',
    uptime,
    memory,
    cpu, // Now a number instead of an object
    api: {
      calls: apiCalls,
      callsTotal: metrics.apiCallsTotal,
      errors,
      errorsTotal: metrics.errorsTotal,
      errorRate: metrics.errorRate
    },
    timestamp: new Date().toISOString(),
    metrics // Add metrics property to match test expectations
=======
=======
>>>>>>> backup-main
  const cpuUsage = os.loadavg()[0]; // 1 minute load average
  
  return {
    status: 'healthy',
    uptime,
    memory,
    cpu: cpuUsage,
    metrics: getMetrics()
<<<<<<< HEAD
>>>>>>> 886f868 (Push project copy to 28mars branch)
=======
>>>>>>> backup-main
  };
}

/**
 * Reset metrics
 */
function resetMetrics() {
<<<<<<< HEAD
<<<<<<< HEAD
  apiCalls = {};
  errors = {};
  responseTimes = [];
  startTime = Date.now();
}

/**
 * Pour les tests uniquement: récupérer l'état interne
 * @returns {Object} - État interne
 */
function __getInternalMetricsForTest() {
  return {
    apiCalls,
    errors,
    responseTimes,
    startTime
  };
}

/**
 * Arrête le monitoring
 */
function shutdown() {
  logger.info('Shutting down monitoring');
  // Aucune action nécessaire pour le moment
  // Ce serait utile s'il y avait des intervalles à effacer
=======
=======
>>>>>>> backup-main
  metrics.apiCalls = {};
  metrics.errors = {};
  metrics.lastResetTime = Date.now();
  metrics.responseTimes = [];
}

/**
 * Shutdown monitoring
 */
function shutdown() {
  logger.info('Shutting down monitoring');
<<<<<<< HEAD
>>>>>>> 886f868 (Push project copy to 28mars branch)
=======
>>>>>>> backup-main
}

module.exports = {
  recordApiUsage,
  recordError,
  recordResponseTime,
  getMetrics,
  getSystemHealth,
  resetMetrics,
<<<<<<< HEAD
<<<<<<< HEAD
  shutdown,
  __getInternalMetricsForTest,
  // For backward compatibility
  trackApiCall: recordApiUsage,
  trackError: recordError,
  resetStats: resetMetrics
=======
  shutdown
>>>>>>> 886f868 (Push project copy to 28mars branch)
=======
  shutdown
>>>>>>> backup-main
};
