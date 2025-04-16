/**
 * Monitoring Module
 * Handles system monitoring and alerts
 */
const os = require('os');
const logger = require('../utils/logger');
const notifications = require('../utils/notification');
const config = require('../config');

// API usage stats
const apiUsage = {};
let errorCounter = 0;
let apiCallsTotal = 0;
let monitoringInterval = null;

/**
 * Record API endpoint usage
 * @param {string} endpoint - API endpoint name
 */
function recordApiUsage(endpoint) {
  if (!apiUsage[endpoint]) {
    apiUsage[endpoint] = 0;
  }
  
  apiUsage[endpoint]++;
  apiCallsTotal++;
}

/**
 * Record error occurrence
 * @param {Error|string} error - Error object or message
 */
function recordError(error) {
  errorCounter++;
  logger.error(`Error recorded: ${error instanceof Error ? error.message : error}`);
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
    used: os.totalmem() - os.freemem(),
    usagePercent: Math.round((1 - os.freemem() / os.totalmem()) * 100)
  };
  
  const cpuUsage = os.loadavg()[0]; // 1 minute load average
  const cpuCount = os.cpus().length;
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime,
    memory,
    cpu: {
      loadAverage: cpuUsage,
      cores: cpuCount,
      usagePercent: Math.round((cpuUsage / cpuCount) * 100)
    },
    api: {
      totalCalls: apiCallsTotal,
      errors: errorCounter,
      endpoints: apiUsage,
      errorRate: apiCallsTotal > 0 ? errorCounter / apiCallsTotal : 0
    }
  };
}

/**
 * Check thresholds and trigger alerts if needed
 * @returns {Object} - Check results
 */
function checkThresholds() {
  const health = getSystemHealth();
  const alerts = [];
  
  // Check memory usage
  if (health.memory.usagePercent > config.monitoring?.alertThresholds?.memory || 85) {
    const message = `Memory usage alert: ${health.memory.usagePercent}%`;
    alerts.push({ type: 'memory', message });
    logger.warn(message);
    notifications.notifyAdmin(message);
  }
  
  // Check CPU usage
  if (health.cpu.usagePercent > config.monitoring?.alertThresholds?.cpu || 80) {
    const message = `CPU usage alert: ${health.cpu.usagePercent}%`;
    alerts.push({ type: 'cpu', message });
    logger.warn(message);
    notifications.notifyAdmin(message);
  }
  
  // Check error rate
  const errorRateThreshold = config.monitoring?.alertThresholds?.errorRate || 0.05;
  if (health.api.errorRate > errorRateThreshold && health.api.totalCalls > 10) {
    const message = `Error rate alert: ${(health.api.errorRate * 100).toFixed(2)}%`;
    alerts.push({ type: 'error_rate', message });
    logger.warn(message);
    notifications.notifyAdmin(message);
  }
  
  return {
    hasAlerts: alerts.length > 0,
    alerts,
    health
  };
}

/**
 * Start periodic monitoring
 * @param {number} interval - Check interval in milliseconds
 * @returns {Object} - Monitoring information
 */
function startMonitoring(interval = 60000) {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  logger.info(`Starting system monitoring with ${interval}ms interval`);
  
  monitoringInterval = setInterval(() => {
    const checkResult = checkThresholds();
    if (checkResult.hasAlerts) {
      logger.warn(`System alerts detected: ${checkResult.alerts.length}`);
    }
  }, interval);
  
  return {
    monitoringActive: true,
    interval,
    startTime: new Date().toISOString()
  };
}

/**
 * Stop monitoring
 */
function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('System monitoring stopped');
  }
}

/**
 * Reset monitoring counters
 */
function resetCounters() {
  Object.keys(apiUsage).forEach(key => {
    apiUsage[key] = 0;
  });
  
  apiCallsTotal = 0;
  errorCounter = 0;
  
  logger.info('Monitoring counters reset');
}

module.exports = {
  recordApiUsage,
  recordError,
  getSystemHealth,
  checkThresholds,
  startMonitoring,
  stopMonitoring,
  resetCounters
};
