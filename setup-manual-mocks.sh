#!/bin/bash
# Script to set up manual mocks for Jest

echo "Setting up manual mocks for Jest..."

# Create the __mocks__ directory at the root level
mkdir -p __mocks__

# Create tesseract.js mock
cat > __mocks__/tesseract.js << 'EOL'
const mockTesseract = {
  createWorker: jest.fn().mockImplementation(() => {
    return {
      load: jest.fn().mockResolvedValue({}),
      loadLanguage: jest.fn().mockResolvedValue({}),
      initialize: jest.fn().mockResolvedValue({}),
      setParameters: jest.fn().mockResolvedValue({}),
      recognize: jest.fn().mockResolvedValue({
        data: {
          text: 'Sample Invoice\nVendor: Test Company\nInvoice #: INV-12345\nAmount: $100.00\nDate: 2025-03-19',
          confidence: 95,
          lines: [
            { text: 'Sample Invoice', confidence: 98 },
            { text: 'Vendor: Test Company', confidence: 96 },
            { text: 'Invoice #: INV-12345', confidence: 97 },
            { text: 'Amount: $100.00', confidence: 95 },
            { text: 'Date: 2025-03-19', confidence: 94 }
          ]
        }
      }),
      terminate: jest.fn().mockResolvedValue({})
    };
  })
};

module.exports = mockTesseract;
EOL

# Create winston mock
cat > __mocks__/winston.js << 'EOL'
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn()
};

const mockWinston = {
  format: {
    combine: jest.fn().mockReturnValue({}),
    timestamp: jest.fn().mockReturnValue({}),
    printf: jest.fn().mockReturnValue({}),
    colorize: jest.fn().mockReturnValue({}),
    json: jest.fn().mockReturnValue({})
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  },
  createLogger: jest.fn().mockReturnValue(mockLogger)
};

module.exports = mockWinston;
EOL

# Create manual mock for logger
mkdir -p __mocks__/utils
cat > __mocks__/utils/logger.js << 'EOL'
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn()
};

module.exports = mockLogger;
EOL

# Create manual mock for app.js
cat > __mocks__/app.js << 'EOL'
const express = require('express');

// Create a simple express app for testing
const app = express();

// Add basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add mock routes
app.use('/api/invoices', require('../routes/invoice-routes'));
app.use('/api/voice', require('../routes/voice-routes'));

// Add error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message || 'An unexpected error occurred'
  });
});

module.exports = app;
EOL

echo "Manual mocks have been set up at __mocks__/"

echo "Now update your test files to use jest.mock() for these dependencies"