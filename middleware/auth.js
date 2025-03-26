/**
 * Middleware d'authentification
 */
const logger = require('../utils/logger');

/**
 * Vérifie la clé API
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
function authenticateApiKey(req, res, next) {
  // Récupérer la clé API de l'en-tête
  const apiKey = req.headers['x-api-key'];
  
  // Clé API valide depuis l'environnement ou une valeur de test
  const validApiKey = process.env.API_KEY || 'test-api-key';
  
  // Dans l'environnement de test, ignorer l'authentification
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  // Vérifier si la clé est fournie
  if (!apiKey) {
    logger.warn('Tentative d\'accès sans clé API');
    return res.status(401).json({
      success: false,
      error: 'Clé API requise'
    });
  }
  
  // Vérifier si la clé est valide
  if (apiKey !== validApiKey) {
    logger.warn(`Tentative d'accès avec une clé API invalide: ${apiKey.substring(0, 5)}...`);
    return res.status(401).json({
      success: false,
      error: 'Clé API invalide'
    });
  }
  
  // Clé valide, continuer
  next();
}

module.exports = {
  authenticateApiKey
};
