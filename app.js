/**
 * Application principale
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const { errorMiddleware } = require('./utils/error-handler');

// Créer l'application Express
const app = express();

// Middleware de base
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use('/api/voice', require('./routes/voice-routes'));
app.use('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Route pour SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware d'erreur global
app.use(errorMiddleware);

module.exports = app;
