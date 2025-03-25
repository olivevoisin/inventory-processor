/**
 * Main application file for the Inventory Management System
 */


const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const logger = require('./utils/logger');
const { globalErrorHandler } = require('./utils/error-handler');
const { trackApiCall, standardizeResponse } = require('./middleware/common');
const monitoring = require('./utils/monitoring');
const invoiceService = require('./modules/invoice-service');

// Create Express app
const app = express();
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { createLogger } = require('./utils/logger');


// Import routes
const voiceRoutes = require('./routes/voice-routes');
const invoiceRoutes = require('./routes/invoice-routes');
const inventoryRoutes = require('./routes/inventory-routes');
const i18nRoutes = require('./routes/i18n-routes');


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/voice', voiceRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/i18n', i18nRoutes);

app.use('/health', require('./routes/health'));
app.use('/api/voice', require('./routes/voice-routes'));
app.use('/api/invoices', require('./routes/invoice-routes'));
app.use('/api/inventory', require('./routes/inventory-routes'));

app.use(compression());
app.use(logger.requestMiddleware);
app.use(trackApiCall);
app.use(standardizeResponse);


// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: config.appName,
    version: config.version,
    environment: config.environment,
    status: 'online'
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  error.errorCode = 'ROUTE_NOT_FOUND';
  next(error);
});

// Apply global error handler
app.use(globalErrorHandler);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: err.name || 'SERVER_ERROR'
  });
});


// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    port: PORT,
    environment: config.environment,
    version: config.version
  });

// Start invoice processing scheduler if enabled
if (config.invoiceProcessing.enabled) {
  invoiceService.startScheduler();
  logger.info('Invoice processing scheduler started', {
    schedule: config.invoiceProcessing.schedule
  });
}
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
logger.info('SIGTERM received, shutting down gracefully');

// Stop scheduler
invoiceService.stopScheduler();

// Stop monitoring
monitoring.shutdown();

server.close(() => {
  logger.info('Process terminated');
  process.exit(0);
});

// Force close after 10s
setTimeout(() => {
  logger.error('Forced shutdown after timeout');
  process.exit(1);
}, 10000);
});

module.exports = app;
