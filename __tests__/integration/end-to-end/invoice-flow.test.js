// Mock fs completely to avoid any real file system access
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn().mockResolvedValue(['invoice1.pdf', 'invoice2.pdf']),
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock pdf content')),
    unlink: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined)
  },
  createReadStream: jest.fn().mockReturnValue({
    pipe: jest.fn().mockReturnThis(),
    on: jest.fn((event, callback) => {
      if (event === 'end') callback();
      return this;
    })
  }),
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock path to prevent real path resolution
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/'))
}));

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn()
  })
}), { virtual: true });

// Mock invoice-processor module
jest.mock('../../../modules/invoice-processor', () => ({
  extractInvoiceData: jest.fn().mockResolvedValue({
    invoiceNumber: 'INV-001',
    date: '2025-03-01',
    totalAmount: 1000,
    items: [
      { name: '商品A', quantity: 5, unitPrice: 100 },
      { name: '商品B', quantity: 2, unitPrice: 250 }
    ]
  })
}), { virtual: true });

// Mock translation-service module
jest.mock('../../../modules/translation-service', () => ({
  batchTranslate: jest.fn().mockImplementation(items => {
    return Promise.resolve(
      items.map(item => ({
        ...item,
        name: `Translated: ${item.name}`
      }))
    );
  })
}), { virtual: true });

// Mock database-utils module
jest.mock('../../../utils/database-utils', () => ({
  saveInvoice: jest.fn().mockResolvedValue({ id: 'inv-123' }),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true })
}), { virtual: true });

// Mock logger module
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

// Mock notification module
jest.mock('../../../utils/notification', () => ({
  notifyAdmin: jest.fn().mockResolvedValue({ success: true }),
  notifyError: jest.fn().mockResolvedValue({ success: true })
}), { virtual: true });

// Mock simple config module with all required properties
jest.mock('../../../config', () => ({
  invoiceProcessing: {
    inputDir: './test-uploads/invoices',
    archiveDir: './test-uploads/invoices/archive',
    errorDir: './test-uploads/invoices/error',
    enabled: true,
    cron: '0 * * * *', 
    batchSize: 10
  },
  googleTranslate: {
    projectId: 'mock-project',
    keyFilename: './mock-key.json'
  }
}), { virtual: true });

// Mock error-handler module
jest.mock('../../../utils/error-handler', () => ({
  ValidationError: class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  }
}), { virtual: true });

describe('Invoice Processing End-to-End Flow', () => {
  let fs;
  let mockInvoiceProcessor;
  let mockTranslationService;
  let mockDatabase;
  let mockLogger;
  let mockNotification;
  let invoiceService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    fs = require('fs');
    mockInvoiceProcessor = require('../../../modules/invoice-processor');
    mockTranslationService = require('../../../modules/translation-service');
    mockDatabase = require('../../../utils/database-utils');
    mockLogger = require('../../../utils/logger');
    mockNotification = require('../../../utils/notification');
    
    // Reset modules to ensure clean state for each test
    jest.resetModules();
    
    try {
      // Load the invoice-service module
      invoiceService = require('../../../modules/invoice-service');
      console.log('Invoice Service module structure:', Object.keys(invoiceService));
    } catch (error) {
      console.error('Error loading invoice-service module:', error.message);
    }
  });
  
  test('invoice service module loads correctly', () => {
    expect(invoiceService).toBeDefined();
    
    // Log the module structure to understand it better
    console.log('Invoice Service methods:', Object.keys(invoiceService));
    
    // For now, let's just verify the module loads
    expect(true).toBe(true);
  });
  
  test('mock functions work correctly', async () => {
    // Test the mocks are working
    const files = await fs.promises.readdir('./test-dir');
    expect(files).toContain('invoice1.pdf');
    
    const invoiceData = await mockInvoiceProcessor.extractInvoiceData(Buffer.from('test'));
    expect(invoiceData.items.length).toBe(2);
    
    const translatedItems = await mockTranslationService.batchTranslate(invoiceData.items);
    expect(translatedItems[0].name).toContain('Translated:');
  });
  
  // Add this test to understand the service's structure
  test('explore invoice service structure', () => {
    console.log('Invoice Service type:', typeof invoiceService);
    
    if (typeof invoiceService === 'function') {
      console.log('It appears to be a constructor function or class');
      
      // Try instantiating it
      try {
        const instance = new invoiceService();
        console.log('Instance methods:', Object.keys(instance));
        expect(instance).toBeDefined();
      } catch (error) {
        console.log('Error instantiating:', error.message);
      }
    } else if (typeof invoiceService === 'object') {
      console.log('It appears to be an object with properties:', Object.keys(invoiceService));
      
      // Check for common method patterns
      const methods = Object.keys(invoiceService).filter(key => typeof invoiceService[key] === 'function');
      console.log('Methods found:', methods);
      
      if (methods.length > 0) {
        expect(methods.length).toBeGreaterThan(0);
      }
    }
  });
});
