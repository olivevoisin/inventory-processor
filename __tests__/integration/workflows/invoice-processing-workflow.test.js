// __tests__/integration/workflows/invoice-processing-workflow.test.js
const path = require('path');
const fs = require('fs').promises;
const invoiceProcessor = require('../../../modules/invoice-processor');
const translationService = require('../../../modules/translation-service');
const dbUtils = require('../../../utils/database-utils');
const logger = require('../../../utils/logger');

// Sample test data
const sampleInvoiceDir = path.join('__fixtures__', 'invoices');
const sampleProcessedDir = path.join('__fixtures__', 'processed');
const sampleInvoiceFile = path.join(sampleInvoiceDir, 'test-invoice.pdf');

// Mock dependencies
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    promises: {
      ...originalFs.promises,
      readdir: jest.fn().mockResolvedValue(['invoice1.pdf', 'invoice2.pdf']),
      readFile: jest.fn().mockResolvedValue(Buffer.from('test invoice data')),
      writeFile: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
      access: jest.fn().mockResolvedValue(undefined),
      rename: jest.fn().mockResolvedValue(undefined),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => true })
    }
  };
});

jest.mock('../../../modules/invoice-processor', () => ({
  processInvoice: jest.fn().mockResolvedValue({
    items: [
      { product: 'Vodka Grey Goose', count: 5, price: '14,995' },
      { product: 'Wine Cabernet', count: 10, price: '15,990' }
    ],
    invoiceDate: '2023-01-15',
    total: '30,985',
    location: 'Bar'
  })
}));

jest.mock('../../../modules/translation-service', () => ({
  translateItems: jest.fn().mockImplementation((items) => {
    return Promise.resolve(items);
  })
}));

jest.mock('../../../utils/database-utils', () => ({
  findProductByName: jest.fn().mockImplementation((name) => {
    const products = {
      'Vodka Grey Goose': { id: 1, name: 'Vodka Grey Goose', unit: 'bottle', price: '29.99' },
      'Wine Cabernet': { id: 2, name: 'Wine Cabernet', unit: 'bottle', price: '15.99' }
    };
    
    return Promise.resolve(products[name] || null);
  }),
  saveInvoice: jest.fn().mockResolvedValue(true),
  saveInventoryItems: jest.fn().mockResolvedValue(true),
  addProduct: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Import the workflow module to test
const invoiceWorkflow = require('../../../modules/invoice-service');

describe('Invoice Processing and Translation Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('complete invoice processing workflow extracts, translates and stores invoice data', async () => {
    // 1. Process a directory of invoices
    const result = await invoiceWorkflow.processInvoices(sampleInvoiceDir, sampleProcessedDir);
    
    // 2. Verify invoices were processed
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('processed');
    expect(result.success).toBe(true);
    expect(result.processed).toBeGreaterThan(0);
    
    // 3. Verify all steps were performed
    expect(fs.readdir).toHaveBeenCalled();
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
    
    // 4. Verify database operations
    expect(dbUtils.saveInvoice).toHaveBeenCalled();
    expect(dbUtils.saveInventoryItems).toHaveBeenCalled();
  });
  
  test('processes a single invoice correctly', async () => {
    // 1. Process a single invoice
    const result = await invoiceWorkflow.processSingleInvoice(sampleInvoiceFile, 'Bar');
    
    // 2. Verify extraction and translation
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
    
    // 3. Verify result
    expect(result).toHaveProperty('items');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toHaveProperty('product', 'Vodka Grey Goose');
    expect(result.items[1]).toHaveProperty('product', 'Wine Cabernet');
  });
  
  test('adds new products when not found in database', async () => {
    // 1. Mock a new product not in database
    dbUtils.findProductByName.mockResolvedValueOnce(null);
    
    // 2. Process an invoice with new product
    await invoiceWorkflow.processSingleInvoice(sampleInvoiceFile, 'Bar');
    
    // 3. Verify product was added
    expect(dbUtils.addProduct).toHaveBeenCalled();
  });
  
  test('handles extraction errors gracefully', async () => {
    // 1. Mock extraction error
    invoiceProcessor.processInvoice.mockRejectedValueOnce(new Error('OCR failed'));
    
    // 2. Process with error
    await expect(
      invoiceWorkflow.processSingleInvoice(sampleInvoiceFile, 'Bar')
    ).rejects.toThrow('OCR failed');
    
    // 3. Verify error was logged
    expect(logger.error).toHaveBeenCalled();
  });
  
  test('handles translation errors gracefully', async () => {
    // 1. Mock translation error
    invoiceProcessor.processInvoice.mockImplementationOnce(() => {
      throw new Error('Translation failed');
    });
    
    // 2. Process with error
    await expect(
      invoiceWorkflow.processSingleInvoice(sampleInvoiceFile, 'Bar')
    ).rejects.toThrow('Translation failed');
    
    // 3. Verify error was logged
    expect(logger.error).toHaveBeenCalled();
  });
  
  test('handles empty input directory gracefully', async () => {
    // 1. Mock empty directory
    fs.readdir.mockResolvedValueOnce([]);
    
    // 2. Process empty directory
    const result = await invoiceWorkflow.processInvoices(sampleInvoiceDir, sampleProcessedDir);
    
    // 3. Verify result
    expect(result).toBeDefined();
    expect(result.processed).toBe(0);
    expect(result.success).toBe(true);
  });
});
