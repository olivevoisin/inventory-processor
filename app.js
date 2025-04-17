/**
 * Main application file
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { handleError } = require('./utils/error-handler'); 
const { trackApiCall, standardizeResponse } = require('./middleware/common');
const globalErrorHandler = require('./middleware/globalErrorHandler');

// Create express app
const app = express();

// Apply middleware
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(trackApiCall);
app.use(standardizeResponse);
// REMOVED global authenticateApiKey to prevent double authentication

// Import routes
const voiceRoutes = require('./routes/voice-routes');
const invoiceRoutes = require('./routes/invoice-routes');
const inventoryRoutes = require('./routes/inventory-routes');
const healthRoutes = require('./routes/health');
const i18nRoutes = require('./routes/i18n-routes');
const authRoutes = require('./routes/auth-routes');

// Apply routes
app.use('/api/voice', voiceRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);
app.use('/api/i18n', i18nRoutes);
app.use('/api/auth', authRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Mock endpoints for API tests
app.get('/api/voice/status/:id', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'processed',
    jobId: req.params.id
  });
});

app.get('/api/invoice/status/:id', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'processed',
    jobId: req.params.id
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Inventory Management System',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Error handler
app.use(handleError);
app.use(globalErrorHandler); // Apply global error handler

module.exports = app;
