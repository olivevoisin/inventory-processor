/**
 * System monitoring utilities
 */
const os = require('os');
const config = require('../config');

// API usage tracker
const apiUsage = {};

/**
 * Record API endpoint usage
 * @param {string} endpoint - API endpoint name
 */
function recordApiUsage(endpoint) {
  if (!apiUsage[endpoint]) {
    apiUsage[endpoint] = 0;
  }
  
  apiUsage[endpoint]++;
}

/**
 * Record error occurrence
 * @param {Error} error - Error object
 * @param {string} source - Error source
 */
function recordError(error, source) {
  // In a real implementation, this would store errors in a database
  // or send them to an error monitoring service
  console.error(`[${source}] ${error.message}`);
}

/**
 * Get system health information
 * @returns {Object} Health information
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
    apiUsage
  };
}

module.exports = {
  recordApiUsage,
  recordError,
  getSystemHealth
};
