// routes/health.js

const express = require('express');
const router = express.Router();
const config = require('../config');
const logger = require('../utils/logger');
const database = require('../utils/database-utils');
const monitoring = require('../utils/monitoring');
const { asyncHandler } = require('../utils/error-handler');

/**
 * Basic health check endpoint
 * @route GET /health
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.version
  });
});

/**
 * Detailed health check with component status
 * Requires API key if detailed status is enabled
 * @route GET /health/detailed
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  // Check if detailed status is enabled
  if (!config.healthCheck.enabled || !config.healthCheck.detailedStatusEnabled) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'DETAILED_STATUS_DISABLED',
        message: 'Detailed health check is disabled'
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  }
  
  // Validate API key if provided
  if (config.healthCheck.apiKey && 
    req.headers['x-api-key'] !== config.healthCheck.apiKey) {
  return res.status(401).json({
    success: false,
    error: {
      code: 'INVALID_API_KEY',
      message: 'Invalid API key'
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
}

logger.info('Detailed health check requested', {
  module: 'health-check',
  ip: req.ip
});
  
  // Check database connection
  let databaseStatus = 'ok';
  let databaseMessage = null;
  
  try {
    await database.getDocument();
  } catch (error) {
    databaseStatus = 'error';
    databaseMessage = error.message;
    
    logger.error('Database health check failed', {
      module: 'health-check',
      error: error.message
    });
  }
  
  // Get system metrics
  const metrics = monitoring.getMetrics();
  
  // Get memory usage
  const memoryUsage = process.memoryUsage();
  
  // Return detailed status with standardized format
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.version,
    components: {
      database: {
        status: databaseStatus,
        message: databaseMessage
      },
      voice: {
        status: 'ok',
        enabled: true
      },
      invoice: {
        status: 'ok',
        enabled: config.invoiceProcessing.enabled,
        scheduled: config.invoiceProcessing.schedule
      },
      translation: {
        status: 'ok',
        enabled: config.googleTranslate.enabled
      }
    },
    resources: {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }
    },
    metrics: {
      uptime: metrics.uptime,
      apiCalls: metrics.apiCallsTotal,
      errors: metrics.errorsTotal,
      errorRate: metrics.errorRate.toFixed(4),
      avgResponseTime: metrics.avgResponseTime
    }
  });
}));

module.exports = router;