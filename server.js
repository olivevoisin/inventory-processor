/**
 * Point d'entrée principal de l'application
 */
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

// Récupérer le port depuis la configuration
const PORT = config.port;

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info(`Serveur démarré sur le port ${PORT} en mode ${config.environment}`);
  });
  
  // Gérer l'arrêt gracieux
  process.on('SIGTERM', () => {
    logger.info('Signal SIGTERM reçu, arrêt gracieux');
    server.close(() => {
      logger.info('Serveur arrêté');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    logger.info('Signal SIGINT reçu, arrêt gracieux');
    server.close(() => {
      logger.info('Serveur arrêté');
      process.exit(0);
    });
  });
}

// Exporter pour les tests
module.exports = app;
