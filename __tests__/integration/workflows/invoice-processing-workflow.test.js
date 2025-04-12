<<<<<<< HEAD
=======
/**
 * Integration tests for invoice processing workflow
 */
const fs = require('fs');
const path = require('path');
>>>>>>> backup-main
const invoiceService = require('../../../modules/invoice-service');
const invoiceProcessor = require('../../../modules/invoice-processor');
const translationService = require('../../../modules/translation-service');
const databaseUtils = require('../../../utils/database-utils');
<<<<<<< HEAD
const fs = require('fs');
const path = require('path');

// Mocks
jest.mock('../../../modules/invoice-processor');
jest.mock('../../../modules/translation-service');
jest.mock('../../../utils/database-utils');
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    mkdir: jest.fn(),
    rename: jest.fn()
  }
}));
jest.mock('path');
=======

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
>>>>>>> backup-main

describe('Invoice Processing and Translation Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
<<<<<<< HEAD
    // Mock de fs.promises.readdir
    fs.promises.readdir.mockResolvedValue(['invoice1.pdf', 'invoice2.pdf']);
    fs.promises.mkdir.mockResolvedValue(undefined);
    fs.promises.rename.mockResolvedValue(undefined);
    
    // Mock de path.join et path.extname
    path.join.mockImplementation((...args) => args.join('/'));
    path.extname = jest.fn(file => {
      if (file.includes('.pdf')) return '.pdf';
      if (file.includes('.jpg')) return '.jpg';
      return '';
    });
    
    // Mocker l'extraction des factures
    invoiceProcessor.processInvoice.mockResolvedValue({
      invoiceId: `INV-${Date.now()}`,
      invoiceDate: '2023-01-15',
      total: '30,985',
      items: [
        { product: 'Vodka Grey Goose', count: 5, price: '14,995' },
        { product: 'Wine Cabernet', count: 10, price: '15,990' }
      ]
    });
    
    // Mocker la traduction
    translationService.translateItems.mockResolvedValue([
      { product: 'Vodka Grey Goose', count: 5, price: '14,995', translated_name: 'Vodka Grey Goose (Translated)' },
      { product: 'Wine Cabernet', count: 10, price: '15,990', translated_name: 'Wine Cabernet (Translated)' }
    ]);
    
    // Mocker la sauvegarde en base
    databaseUtils.saveInvoice.mockResolvedValue({ id: 'DB-123' });
    databaseUtils.saveInventoryItems.mockResolvedValue({ success: true });
    databaseUtils.findProductByName.mockResolvedValue(null);
    databaseUtils.addProduct.mockResolvedValue({ success: true });
  });
  
  test('complete invoice processing workflow extracts, translates and stores invoice data', async () => {
    // Arrange
    const sourceDir = '/test/invoices';
    const processedDir = '/test/processed';
=======
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
>>>>>>> backup-main
    
    // Act
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.processed).toBeGreaterThan(0);
<<<<<<< HEAD
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
=======
    expect(invoiceProcessor.extractInvoiceData).toHaveBeenCalled();
>>>>>>> backup-main
    expect(databaseUtils.saveInvoice).toHaveBeenCalled();
    expect(fs.promises.rename).toHaveBeenCalled();
  });
  
<<<<<<< HEAD
  test('processes a single invoice correctly', async () => {
    // Arrange
    const filePath = '/test/invoices/invoice1.pdf';
=======
  it('processes a single invoice correctly', async () => {
    // Arrange
    const filePath = '/test/invoices/sample.pdf';
>>>>>>> backup-main
    const location = 'Bar';
    
    // Act
    const result = await invoiceService.processSingleInvoice(filePath, location);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
<<<<<<< HEAD
    expect(invoiceProcessor.processInvoice).toHaveBeenCalledWith(filePath, location);
    expect(translationService.translateItems).toHaveBeenCalled();
    expect(databaseUtils.saveInvoice).toHaveBeenCalled();
  });
  
  test('adds new products when not found in database', async () => {
    // Arrange
    const filePath = '/test/invoices/invoice1.pdf';
    
    // Mock pour ce test spécifique
    databaseUtils.findProductByName.mockResolvedValue(null);
    
    // Act
    const result = await invoiceService.processSingleInvoice(filePath, 'Bar');
    
    // Assert
    expect(result).toBeDefined();
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
  });
  
  test('handles extraction errors gracefully', async () => {
    // Arrange
    const sourceDir = '/test/invoices';
    const processedDir = '/test/processed';
    
    // Mock pour ce test spécifique
    invoiceProcessor.processInvoice.mockRejectedValueOnce(new Error('Extraction error'));
    
    // Act
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.errors).toBeGreaterThan(0);
  });
  
  test('handles translation errors gracefully', async () => {
    // Arrange
    const filePath = '/test/invoices/invoice1.pdf';
    
    // Mock pour ce test spécifique
    translationService.translateItems.mockRejectedValueOnce(new Error('Translation error'));
    
    // Act & Assert
    await expect(invoiceService.processSingleInvoice(filePath, 'Bar')).rejects.toThrow();
  });
  
  test('handles empty input directory gracefully', async () => {
    // Arrange
    const sourceDir = '/test/empty';
    const processedDir = '/test/processed';
    
    // Mock pour ce test spécifique
    fs.promises.readdir.mockResolvedValueOnce([]);
    
    // Act
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
=======
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
>>>>>>> backup-main
  });
});
