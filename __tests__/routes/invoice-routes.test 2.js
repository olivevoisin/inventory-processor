// Mock Express properly to register route handlers
jest.mock('express', () => {
  // Create mock route methods that store handlers
  const handlers = {
    get: [],
    post: [],
    put: [],
    delete: []
  };
  
  // Create mock router with methods that record calls
  const mockRouter = {
    get: jest.fn().mockImplementation((path, ...middlewares) => {
      handlers.get.push({ path, middlewares });
      return mockRouter;
    }),
    post: jest.fn().mockImplementation((path, ...middlewares) => {
      handlers.post.push({ path, middlewares });
      return mockRouter;
    }),
    put: jest.fn().mockImplementation((path, ...middlewares) => {
      handlers.put.push({ path, middlewares });
      return mockRouter;
    }),
    delete: jest.fn().mockImplementation((path, ...middlewares) => {
      handlers.delete.push({ path, middlewares });
      return mockRouter;
    })
  };
  
  // Return express factory function
  const express = jest.fn();
  express.Router = jest.fn().mockReturnValue(mockRouter);
  express.handlers = handlers; // Attach for test inspection
  return express;
});

// Mock multer with diskStorage
jest.mock('multer', () => {
  const multer = jest.fn().mockImplementation(() => ({
    single: jest.fn().mockReturnValue((req, res, next) => next())
  }));
  multer.diskStorage = jest.fn().mockImplementation((config) => ({
    destination: config.destination,
    filename: config.filename
  }));
  return multer;
});

// Mock the invoice service
jest.mock('../../modules/invoice-service', () => ({ // Changed from ../../../modules/invoice-service
  processIncomingInvoices: jest.fn().mockResolvedValue({
    success: true,
    processed: 2,
    failed: 0
  })
}));

// Mock the database utils
jest.mock('../../utils/database-utils', () => ({
  getInvoiceById: jest.fn().mockImplementation((id) => {
    if (id === 'inv-123') {
      return Promise.resolve({
        id: 'inv-123',
        date: '2025-03-01',
        items: [
          { name: 'Product A', quantity: 5, price: 100 }
        ]
      });
    }
    return Promise.resolve(null);
  }),
  saveInvoice: jest.fn().mockResolvedValue({ id: 'inv-123' })
}));

// Mock the config module
jest.mock('../../config', () => ({
  googleSheets: {
    apiKey: 'mock-api-key',
    sheetId: 'mock-sheet-id',
    clientEmail: 'mock-client-email',
    privateKey: 'mock-private-key'
  },
  uploads: {
    invoiceDir: './uploads/invoices'
  }
}));

// Import express after mocking
const express = require('express');
const invoiceRoutes = require('../../routes/invoice-routes');

describe('Invoice Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /invoices/:id route is defined', () => {
    // Force the router to be created
    require('../../routes/invoice-routes');
    
    // Look for a GET route handler for the /invoices/:id pattern
    const getHandlers = express.handlers.get;
    const hasInvoiceByIdRoute = getHandlers.some(handler => 
      handler.path.includes(':id') || handler.path === '/:id');
    
    expect(hasInvoiceByIdRoute).toBe(true);
  });

  test('POST /invoices/process route is defined', () => {
    // Use the already created router
    const postHandlers = express.handlers.post;
    const hasProcessRoute = postHandlers.some(handler => 
      handler.path === '/process' || handler.path.includes('/process'));
    
    expect(hasProcessRoute).toBe(true);
  });
});
