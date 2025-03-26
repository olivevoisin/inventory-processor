/**
 * Gestionnaire d'erreurs
 * Fournit des classes d'erreur personnalisées et un middleware de gestion des erreurs
 */
const logger = require('./logger');

/**
 * Classe d'erreur de base
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreur de validation
 */
class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 400);
    this.fields = fields;
  }
}

/**
 * Erreur d'authentification
 */
class AuthenticationError extends AppError {
  constructor(message = 'Échec d\'authentification') {
    super(message, 401);
  }
}

/**
 * Erreur d'autorisation
 */
class AuthorizationError extends AppError {
  constructor(message = 'Non autorisé') {
    super(message, 403);
  }
}

/**
 * Erreur de ressource non trouvée
 */
class NotFoundError extends AppError {
  constructor(resource = 'Ressource', id = '') {
    const message = id 
      ? `${resource} avec l'ID '${id}' non trouvé(e)` 
      : `${resource} non trouvé(e)`;
    super(message, 404);
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * Erreur de service externe
 */
class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    super(`Erreur du service ${service}: ${message}`, 502);
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Middleware de gestion globale des erreurs
 * @param {Error} err - Erreur survenue
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
function globalErrorHandler(err, req, res, next) {
  // Journaliser l'erreur
  logger.error(`${err.name}: ${err.message}`, {
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500
  });
  
  if (err.stack) {
    logger.debug(err.stack);
  }
  
  // Déterminer le code d'état de la réponse
  const statusCode = err.statusCode || 500;
  
  // Préparer la réponse d'erreur
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Une erreur est survenue',
      type: err.name
    }
  };
  
  // Ajouter des détails pour les erreurs de validation
  if (err instanceof ValidationError && err.fields) {
    errorResponse.error.fields = err.fields;
  }
  
  // En développement, inclure la stack trace
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
  }
  
  // Envoyer la réponse
  res.status(statusCode).json(errorResponse);
}

/**
 * Gestionnaire pour les promesses asynchrones dans les routes
 * @param {Function} fn - Fonction de route asynchrone
 * @returns {Function} - Middleware Express
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ExternalServiceError,
  globalErrorHandler,
  asyncHandler
};
