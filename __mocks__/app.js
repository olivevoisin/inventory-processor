const express = require('express');

// Create a simple express app for testing
const app = express();

// Add basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add mock routes
const mockRouter = express.Router();

// Mock invoice routes
mockRouter.post('/upload', (req, res) => {
  res.status(200).json({
    success: true,
    data: { invoiceId: 'TEST-INV-123' }
  });
});

mockRouter.post('/process', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'processed' }
  });
});

mockRouter.post('/translate', (req, res) => {
  res.status(200).json({
    success: true,
    data: { translatedFields: ['vendor', 'items'] }
  });
});

mockRouter.post('/sync-sheets', (req, res) => {
  res.status(200).json({
    success: true,
    data: { syncStatus: 'completed' }
  });
});

mockRouter.get('/:id', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      invoiceId: req.params.id,
      processingStatus: 'completed',
      syncedToSheets: true
    }
  });
});

app.use('/api/invoices', mockRouter);
app.use('/api/voice', mockRouter);

// Add error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message || 'An unexpected error occurred'
  });
});

module.exports = app;