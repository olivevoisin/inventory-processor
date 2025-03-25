/**
 * Health check API endpoints
 */
const express = require('express');
const router = express.Router();
const monitoring = require('../utils/monitoring');
const logger = require('../utils/logger');

/**
 * @route GET /api/health/ping
 * @desc Simple ping-pong health check
 * @access Public
 */
router.get('/ping', (req, res) => {
  logger.debug('Health ping request received');
  return res.status(200).json({ message: 'pong' });
});

/**
 * @route GET /api/health/status
 * @desc More detailed system health information
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const healthInfo = monitoring.getSystemHealth();
    logger.debug('Health status request received');
    return res.status(200).json(healthInfo);
  } catch (error) {
    logger.error(`Error getting health status: ${error.message}`);
    return res.status(500).json({ error: 'Could not retrieve health information' });
  }
});

module.exports = router;
