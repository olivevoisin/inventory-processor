/**
 * Routes de vérification de l'état du service
 */
const express = require('express');
const router = express.Router();
const os = require('os');
const monitoring = require('../utils/monitoring');
const logger = require('../utils/logger');

/**
 * @route GET /api/health/ping
 * @desc Simple vérification de disponibilité
 * @access Public
 */
router.get('/ping', (req, res) => {
  logger.debug('Requête de ping reçue');
  return res.status(200).json({ message: 'pong' });
});

/**
 * @route GET /api/health/status
 * @desc Informations détaillées sur l'état du système
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const healthInfo = monitoring.getSystemHealth();
    logger.debug('Requête de statut reçue');
    return res.status(200).json(healthInfo);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du statut: ${error.message}`);
    return res.status(500).json({ 
      success: false,
      error: 'Impossible de récupérer les informations de santé' 
    });
  }
});

/**
 * @route GET /api/health/system
 * @desc Informations détaillées sur le système et les ressources
 * @access Public
 */
router.get('/system', (req, res) => {
  try {
    const uptime = process.uptime();
    const memory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      percent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
    };
    const cpu = os.loadavg();
    
    return res.status(200).json({
      success: true,
      system: {
        uptime,
        memory,
        cpu,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        hostname: os.hostname()
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des informations système: ${error.message}`);
    return res.status(500).json({ 
      success: false,
      error: 'Impossible de récupérer les informations système' 
    });
  }
});

module.exports = router;
