/**
 * Middleware commun pour l'application
 */
const logger = require('../utils/logger');
const monitoring = require('../utils/monitoring');

/**
 * Middleware pour suivre les appels API
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
function trackApiCall(req, res, next) {
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  
  // Enregistrer l'appel API
  monitoring.trackApiCall(endpoint, method);
  
  // Ajouter l'heure de début pour mesurer la durée
  req.startTime = Date.now();
  
  // Surveiller la réponse
  res.on('finish', () => {
    // Calculer la durée
    const duration = Date.now() - req.startTime;
    
    // Journaliser l'appel API
    logger.info(`${method} ${endpoint} ${res.statusCode} (${duration}ms)`, {
      method,
      endpoint,
      statusCode: res.statusCode,
      duration
    });
    
    // Si c'est une erreur, la suivre
    if (res.statusCode >= 400) {
      monitoring.trackError(endpoint, res.statusCode);
    }
  });
  
  next();
}

/**
 * Middleware pour standardiser les réponses JSON
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
function standardizeResponse(req, res, next) {
  // Sauvegarder la méthode json d'origine
  const originalJson = res.json;
  
  // Remplacer par notre version standardisée
  res.json = function(data) {
    // Si la réponse est déjà standardisée, la laisser telle quelle
    if (data && data.success !== undefined) {
      return originalJson.call(this, data);
    }
    
    // Sinon, créer une réponse standardisée
    const standardResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    
    // Utiliser la méthode d'origine avec notre format standardisé
    return originalJson.call(this, standardResponse);
  };
  
  next();
}

module.exports = {
  trackApiCall,
  standardizeResponse
};
