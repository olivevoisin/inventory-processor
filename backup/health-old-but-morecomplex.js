/**
 * Health check endpoint routes
 */

const express = require('express');
const router = express.Router();
const monitoring = require('../utils/monitoring');
const logger = require('../utils/logger');
const config = require('../config');
const { asyncHandler } = require('../utils/error-handler');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Basic health check endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: config.version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Detailed health status endpoint (with auth)
router.get('/status', asyncHandler(async (req, res) => {
  // Check for API key if configured
  if (config.healthCheck && config.healthCheck.apiKey) {
    const providedKey = req.query.key || req.get('x-api-key');
    if (providedKey !== config.healthCheck.apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized access to detailed health status'
      });
    }
  }
  
  // Get system status from monitoring
  const status = monitoring.getStatus();
  
  res.status(200).json(status);
}));

// Database connection check
router.get('/database', asyncHandler(async (req, res) => {
  // Check for API key if configured
  if (config.healthCheck && config.healthCheck.apiKey) {
    const providedKey = req.query.key || req.get('x-api-key');
    if (providedKey !== config.healthCheck.apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized access to database health check'
      });
    }
  }
  
  const timer = logger.startTimer();
  try {
    // Check Google Sheets connection
    let dbStatus = 'ok';
    let dbMessage = 'Database connection successful';
    
    // Initialize and authenticate Google Sheets
    const doc = new GoogleSpreadsheet(config.googleSheets.docId);
    await doc.useServiceAccountAuth({
      client_email: config.googleSheets.clientEmail,
      private_key: config.googleSheets.privateKey.replace(/\\n/g, '\n'),
    });
    
    // Load document info to check connection
    await doc.loadInfo();
    
    const duration = timer.end();
    monitoring.recordDatabaseOperation(duration, true);
    
    res.status(200).json({
      status: dbStatus,
      message: dbMessage,
      connection: {
        type: 'Google Sheets',
        responseTimeMs: duration,
        documentTitle: doc.title
      }
    });
  } catch (error) {
    const duration = timer.end();
    monitoring.recordDatabaseOperation(duration, false);
    
    logger.error('Database health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      responseTimeMs: duration
    });
  }
}));

// External services health check
router.get('/services', asyncHandler(async (req, res) => {
  // Check for API key if configured
  if (config.healthCheck && config.healthCheck.apiKey) {
    const providedKey = req.query.key || req.get('x-api-key');
    if (providedKey !== config.healthCheck.apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized access to external services health check'
      });
    }
  }
  
  // Check status of all external services
  const services = {
    deepgram: await checkDeepgramService(),
    googleTranslate: await checkGoogleTranslateService(),
    googleSheets: await checkGoogleSheetsService()
  };
  
  // Determine overall status
  const servicesUp = Object.values(services).filter(s => s.status === 'ok').length;
  const totalServices = Object.keys(services).length;
  const overallStatus = servicesUp === totalServices ? 'ok' : 
                        servicesUp > 0 ? 'degraded' : 'down';
  
  res.status(overallStatus === 'down' ? 503 : 200).json({
    status: overallStatus,
    services,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Check Deepgram service health
 */
async function checkDeepgramService() {
  const timer = logger.startTimer();
  try {
    // Simple check to see if Deepgram client can be initialized
    const { createVoiceProcessor } = require('../modules/voice-processor');
    const processor = createVoiceProcessor();
    
    // Just check if API key is valid (don't make an actual API call for health check)
    const isConfigured = processor.checkApiKey();
    
    const duration = timer.end();
    return {
      status: isConfigured ? 'ok' : 'misconfigured',
      responseTimeMs: duration,
      message: isConfigured ? 'Deepgram service is properly configured' : 'Deepgram API key validation failed'
    };
  } catch (error) {
    const duration = timer.end();
    logger.error('Deepgram health check failed', {
      error: error.message
    });
    
    return {
      status: 'error',
      responseTimeMs: duration,
      message: error.message,
      error: error.message
    };
  }
}

/**
 * Check Google Translate service health
 */
async function checkGoogleTranslateService() {
  const timer = logger.startTimer();
  try {
    // Simple check to see if translation service is configured
    const { checkTranslationService } = require('../modules/translation-service');
    const isConfigured = await checkTranslationService();
    
    const duration = timer.end();
    return {
      status: isConfigured ? 'ok' : 'misconfigured',
      responseTimeMs: duration,
      message: isConfigured ? 'Google Translate service is properly configured' : 'Google Translate service configuration check failed'
    };
  } catch (error) {
    const duration = timer.end();
    logger.error('Google Translate health check failed', {
      error: error.message
    });
    
    return {
      status: 'error',
      responseTimeMs: duration,
      message: error.message,
      error: error.message
    };
  }
}

/**
 * Check Google Sheets service health
 */
async function checkGoogleSheetsService() {
  const timer = logger.startTimer();
  try {
    // Check Google Sheets connection
    const doc = new GoogleSpreadsheet(config.googleSheets.docId);
    await doc.useServiceAccountAuth({
      client_email: config.googleSheets.clientEmail,
      private_key: config.googleSheets.privateKey.replace(/\\n/g, '\n'),
    });
    
    // Load document info to check connection
    await doc.loadInfo();
    
    const duration = timer.end();
    return {
      status: 'ok',
      responseTimeMs: duration,
      message: 'Google Sheets connection successful',
      documentTitle: doc.title
    };
  } catch (error) {
    const duration = timer.end();
    logger.error('Google Sheets health check failed', {
      error: error.message
    });
    
    return {
      status: 'error',
      responseTimeMs: duration,
      message: error.message,
      error: error.message
    };
  }
}

module.exports = router;