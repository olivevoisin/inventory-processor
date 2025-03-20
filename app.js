// app.js

const express = require('express');
const cors = require('cors');
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

// Apply security middleware
app.use(helmet());

// Apply CORS
app.use(cors());

// Apply compression
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Apply request logging middleware
app.use(logger.requestMiddleware);

// Apply API call tracking middleware
app.use(trackApiCall);

// Apply response standardization middleware
app.use(standardizeResponse);

// Apply routes
app.use('/health', require('./routes/health'));
app.use('/api/voice', require('./routes/voice-routes'));
app.use('/api/invoices', require('./routes/invoice-routes'));
app.use('/api/inventory', require('./routes/inventory-routes'));

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