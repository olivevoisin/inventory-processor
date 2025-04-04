const invoiceService = require('../../../modules/invoice-service');
const invoiceProcessor = require('../../../modules/invoice-processor');
const translationService = require('../../../modules/translation-service');
const databaseUtils = require('../../../utils/database-utils');
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

describe('Invoice Processing and Translation Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
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
    
    // Act
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.processed).toBeGreaterThan(0);
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
    expect(databaseUtils.saveInvoice).toHaveBeenCalled();
    expect(fs.promises.rename).toHaveBeenCalled();
  });
  
  test('processes a single invoice correctly', async () => {
    // Arrange
    const filePath = '/test/invoices/invoice1.pdf';
    const location = 'Bar';
    
    // Act
    const result = await invoiceService.processSingleInvoice(filePath, location);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
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
  });
});
