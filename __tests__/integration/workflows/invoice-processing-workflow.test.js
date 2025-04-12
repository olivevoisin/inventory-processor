/**
 * Integration tests for invoice processing workflow
 */
const fs = require('fs');
const path = require('path');
const invoiceService = require('../../../modules/invoice-service');
const invoiceProcessor = require('../../../modules/invoice-processor');
const translationService = require('../../../modules/translation-service');
const databaseUtils = require('../../../utils/database-utils');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn(),
    rename: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../../modules/invoice-processor', () => ({
  processInvoice: jest.fn(),
  extractInvoiceData: jest.fn().mockResolvedValue({
    invoiceDate: '2023-01-15',
    items: [
      { product: 'Sake', count: 5, price: '5000' },
      { product: 'Whisky', count: 2, price: '8000' }
    ],
    total: '13000',
    supplier: 'Test Supplier'
  })
}));

jest.mock('../../../modules/translation-service', () => ({
  translateItems: jest.fn().mockImplementation(items => {
    // Simple translation implementation
    return items.map(item => ({
      ...item,
      product: item.product === 'Sake' ? 'Japanese Rice Wine' : item.product
    }));
  })
}));

jest.mock('../../../utils/database-utils', () => ({
  saveInvoice: jest.fn().mockResolvedValue({ id: 'inv-123', success: true }),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true, savedCount: 2 }),
  findProductByName: jest.fn().mockImplementation(name => {
    if (name === 'Japanese Rice Wine') {
      return { id: 'prod-1', name: 'Japanese Rice Wine', unit: 'bottle', price: 25.99 };
    }
    return null;
  }),
  addProduct: jest.fn().mockResolvedValue({ success: true, id: 'prod-new' })
}));

describe('Invoice Processing and Translation Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock file system
    fs.promises.readdir.mockResolvedValue([
      'invoice1.pdf',
      'invoice2.pdf',
      'document.txt' // Non-PDF file that should be ignored
    ]);
  });

  it('complete invoice processing workflow extracts, translates and stores invoice data', async () => {
    // Arrange
    const sourceDir = '/test/invoices';
    const processedDir = '/test/invoices/processed';
    
    // Act
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.processed).toBeGreaterThan(0);
    expect(invoiceProcessor.extractInvoiceData).toHaveBeenCalled();
    expect(databaseUtils.saveInvoice).toHaveBeenCalled();
    expect(fs.promises.rename).toHaveBeenCalled();
  });
  
  it('processes a single invoice correctly', async () => {
    // Arrange
    const filePath = '/test/invoices/sample.pdf';
    const location = 'Bar';
    
    // Act
    const result = await invoiceService.processSingleInvoice(filePath, location);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(translationService.translateItems).toHaveBeenCalled();
  });
  
  it('adds new products when not found in database', async () => {
    // Arrange
    const filePath = '/test/invoices/sample.pdf';
    const location = 'Bar';
    
    // Act
    const result = await invoiceService.processSingleInvoice(filePath, location);
    
    // Assert
    expect(result).toBeDefined();
    expect(databaseUtils.findProductByName).toHaveBeenCalled();
    expect(databaseUtils.addProduct).toHaveBeenCalled();
  });
});
