/**
 * System monitoring utilities
 */
const os = require('os');
const logger = require('./logger');

// Metrics collection
const metrics = {
  apiCalls: {},
  errors: {},
  startTime: Date.now(),
  lastResetTime: Date.now(),
  responseTimes: []
};

/**
 * Record API endpoint usage
 * @param {string} endpoint - API endpoint name
 */
function recordApiUsage(endpoint) {
  if (!metrics.apiCalls[endpoint]) {
    metrics.apiCalls[endpoint] = 0;
  }
  metrics.apiCalls[endpoint]++;
}

/**
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
  }
  metrics.errors[key]++;
  
  logger.error(`Error in ${errorSource}: ${error.message}`);
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
  const cpuUsage = os.loadavg()[0]; // 1 minute load average
  
  return {
    status: 'healthy',
    uptime,
    memory,
    cpu: cpuUsage,
    metrics: getMetrics()
  };
}

/**
 * Reset metrics
 */
function resetMetrics() {
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
}

module.exports = {
  recordApiUsage,
  recordError,
  recordResponseTime,
  getMetrics,
  getSystemHealth,
  resetMetrics,
  shutdown
};
