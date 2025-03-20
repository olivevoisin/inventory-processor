const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
const invoiceRoutes = require('./routes/invoice-routes');
const invoiceProcessor = require('./modules/invoice-processor');
// In server.js
const voiceRoutes = require('./routes/voice-routes');
const invoiceService = require('./scripts/invoice-service');


// Initialize express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));

// API Routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/voice', voiceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'inventory-processor' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Start server
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  
  try {
    // Pre-initialize OCR worker to improve first request performance
    await invoiceProcessor.initialize();
    logger.info('OCR service pre-initialized successfully');
  } catch (error) {
    logger.error('Failed to pre-initialize OCR service', { error: error.message });
  }
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await invoiceProcessor.terminate();
  } catch (error) {
    logger.error('Error during OCR service termination', { error: error.message });
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await invoiceProcessor.terminate();
  } catch (error) {
    logger.error('Error during OCR service termination', { error: error.message });
  }
  
  process.exit(0);
});

module.exports = app; // For testing purposes


// Start your Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Start the invoice scheduler
  invoiceService.start();
});