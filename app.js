/**
 * Application principale
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { globalErrorHandler } = require('./utils/error-handler');
const config = require('./config');
const invoiceService = require('./modules/invoice-service');

// Créer l'application Express
const app = express();

// Middleware de base
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes API
app.use('/api/voice', require('./routes/voice-routes'));
app.use('/api/invoices', require('./routes/invoice-routes'));
app.use('/api/inventory', require('./routes/inventory-routes'));
app.use('/api/auth', require('./routes/auth-routes'));
app.use('/health', require('./routes/health'));

// Fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route pour SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware d'erreur global
app.use(globalErrorHandler);

// Initialiser le service
if (config.invoiceProcessing?.enabled && process.env.NODE_ENV !== 'test') {
  invoiceService.startScheduler();
}

// Gérer les arrêts gracieux
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu, arrêt gracieux');
  
  // Arrêter les services
  if (config.invoiceProcessing?.enabled) {
    invoiceService.stopScheduler();
  }
  
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu, arrêt gracieux');
  
  // Arrêter les services
  if (config.invoiceProcessing?.enabled) {
    invoiceService.stopScheduler();
  }
  
  process.exit(0);
});

module.exports = app;
