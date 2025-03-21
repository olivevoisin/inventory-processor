/**
 * Main Application Entry Point
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');

// Import routes
const healthRoutes = require('./routes/health');
const voiceRoutes = require('./routes/voice-routes');
const invoiceRoutes = require('./routes/invoice-routes');
const inventoryRoutes = require('./routes/inventory-routes');

// Create Express app
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Serve static files (if any)
app.use(express.static(path.join(__dirname, 'public')));

// Apply routes
app.use('/api/health', healthRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/inventory', inventoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message
  });
});

// Start server
const PORT = config.port || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
