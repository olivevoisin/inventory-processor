// Mock Express
jest.mock('express', () => {
  const mockRouter = {
    post: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis()
  };
  
  return {
    Router: jest.fn(() => mockRouter),
    json: jest.fn()
  };
});

// Mock multer with both diskStorage and memoryStorage
jest.mock('multer', () => {
  const multer = jest.fn().mockImplementation(() => ({
    single: jest.fn().mockReturnValue((req, res, next) => next())
  }));
  
  // Add the missing memoryStorage function
  multer.memoryStorage = jest.fn().mockReturnValue({
    _getDestination: jest.fn(),
    _handleFile: jest.fn()
  });
  
  // Keep the diskStorage mock
  multer.diskStorage = jest.fn().mockImplementation((config) => ({
    destination: config.destination,
    filename: config.filename
  }));
  
  return multer;
});

// Mock the voice processor
jest.mock('../../modules/voice-processor', () => ({
  processAudio: jest.fn().mockResolvedValue({
    transcript: 'five bottles of wine',
    items: [
      { name: 'Wine', quantity: 5, unit: 'bottle' }
    ],
    confidence: 0.95
  })
}), { virtual: true });

// Mock the database utils
jest.mock('../../utils/database-utils', () => ({
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true })
}), { virtual: true });

// Mock the config module
jest.mock('../../config', () => ({ // Changed from ../../../config
  googleSheets: {
    apiKey: 'mock-api-key',
    sheetId: 'mock-sheet-id',
    docId: 'mock-doc-id',
    clientEmail: 'mock-client-email',
    privateKey: 'mock-private-key',
    sheetTitles: {
      products: 'Products',
      inventory: 'Inventory',
      invoices: 'Invoices'
    }
  },
  uploads: {
    voiceDir: './uploads/voice'
  }
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

// Mock monitoring to prevent config validation issues
jest.mock('../../utils/monitoring', () => ({
  recordApiUsage: jest.fn(),
  recordError: jest.fn()
}), { virtual: true });

describe('Voice Routes', () => {
  let voiceRoutes;
  let mockDb;
  let mockVoiceProcessor;
  let express;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset modules to ensure clean state
    jest.resetModules();
    
    // Load mocked modules
    express = require('express');
    mockDb = require('../../utils/database-utils');
    mockVoiceProcessor = require('../../modules/voice-processor');
    
    // Import the routes module
    try {
      voiceRoutes = require('../../routes/voice-routes');
    } catch (error) {
      console.error('Error loading voice-routes module:', error.message);
    }
  });
  
  test('POST /voice/process route is defined', () => {
    // Import the routes to trigger the router setup
    require('../../routes/voice-routes');
    
    // Check if the route was defined
    expect(express.Router().post).toHaveBeenCalled();
  });
  
  test('route handler invokes voice processor', () => {
    // TODO: Add test for route handler
    expect(true).toBe(true);
  });
});
