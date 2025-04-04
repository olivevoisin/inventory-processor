// __tests__/mocks/app.js
const express = require('express');

// Mock dependencies before using them
jest.mock('winston', () => require('./winston'));
jest.mock('../../utils/logger', () => require('./logger'));

// Create a simple express app for testing
const app = express();

// Add basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add mock routes
app.use('/api/invoices', require('../../routes/invoice-routes'));
app.use('/api/voice', require('../../routes/voice-routes'));

// Add error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message || 'An unexpected error occurred'
  });
});

module.exports = app;