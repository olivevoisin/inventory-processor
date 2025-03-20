// Mocks must be defined before imports
jest.mock('node-cron');
jest.mock('fs');
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue({}),
    loadLanguage: jest.fn().mockResolvedValue({}),
    initialize: jest.fn().mockResolvedValue({}),
    recognize: jest.fn().mockResolvedValue({
      data: { text: 'Sample Invoice\n商品A 5 100円\n商品B 2 250円\nTotal: 1000円' }
    }),
    terminate: jest.fn().mockResolvedValue({})
  }))
}));

jest.mock('../../../modules/invoice-processor', () => ({
  extractInvoiceData: jest.fn().mockResolvedValue({
    invoiceNumber: 'INV-001',
    date: '2025-03-01',
    totalAmount: 1000,
    items: [
      { name: '商品A', quantity: 5, unitPrice: 100 },
      { name: '商品B', quantity: 2, unitPrice: 250 }
    ],
    supplier: 'Test Supplier Co., Ltd.',
    currency: 'JPY'
  })
}));

jest.mock('../../../modules/translation-service', () => ({
  batchTranslate: jest.fn().mockImplementation(items => {
    return Promise.resolve(
      items.map(item => ({
        ...item,
        name: `Translated: ${item.name}`
      }))
    );
  })
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../../utils/database-utils', () => ({
  saveInvoice: jest.fn().mockResolvedValue({ id: 'inv-123' }),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../../utils/notification', () => ({
  notifyAdmin: jest.fn().mockResolvedValue({ success: true }),
  notifyError: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../../config', () => ({
  invoiceProcessing: {
    inputDir: './uploads/invoices',
    archiveDir: './uploads/invoices/archive',
    errorDir: './uploads/invoices/error',
    enabled: true,
    cron: '0 * * * *',
    batchSize: 10
  },
  googleTranslate: {
    projectId: 'mock-project',
    keyFilename: './mock-key.json'
  }
}));

describe('Invoice Processing End-to-End Flow', () => {
  let invoiceService;
  let fs;
  let mockInvoiceProcessor;
  let mockTranslationService;
  let mockDatabase;
  
  beforeEach(() => {
    jest.resetModules();
    
    // Get mock modules
    fs = require('fs');
    mockInvoiceProcessor = require('../../../modules/invoice-processor');
    mockTranslationService = require('../../../modules/translation-service');
    mockDatabase = require('../../../utils/database-utils');
    
    // Set up mock implementations for fs
    fs.promises = {
      readdir: jest.fn().mockResolvedValue(['invoice1.pdf', 'invoice2.pdf']),
      readFile: jest.fn().mockResolvedValue(Buffer.from('mock pdf content')),
      unlink: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined)
    };
    
    // Import the module being tested
    invoiceService = require('../../../modules/invoice-service');
  });
  
  test('should process invoices from start to finish', async () => {
    // Execute the complete flow
    const result = await invoiceService.processIncomingInvoices();
    
    // Verify processing steps
    expect(fs.promises.readdir).toHaveBeenCalled();
    expect(mockInvoiceProcessor.extractInvoiceData).toHaveBeenCalled();
    expect(mockTranslationService.batchTranslate).toHaveBeenCalled();
    expect(mockDatabase.saveInvoice).toHaveBeenCalled();
    
    // Verify result
    expect(result.processed).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });
  
  test('should handle empty directory gracefully', async () => {
    // Setup for empty directory
    fs.promises.readdir.mockResolvedValueOnce([]);
    
    // Execute
    const result = await invoiceService.processIncomingInvoices();
    
    // Verify
    expect(result.processed).toBe(0);
    expect(result.success).toBe(true);
  });
  
  test('should add translated items to inventory', async () => {
    // Execute
    const result = await invoiceService.processIncomingInvoices();
    
    // Verify
    expect(mockTranslationService.batchTranslate).toHaveBeenCalled();
    expect(mockDatabase.saveInvoice).toHaveBeenCalled();
    expect(mockDatabase.saveInventoryItems).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});