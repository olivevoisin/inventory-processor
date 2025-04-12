<<<<<<< HEAD
const invoiceProcessor = require('../../../modules/invoice-processor');

describe('Invoice Processor Module', () => {
  describe('processInvoice', () => {
    test('should process invoice PDF file correctly', async () => {
      const result = await invoiceProcessor.processInvoice('test.pdf');
      expect(result).toBeDefined();
      expect(result.invoiceId).toBeDefined();
    });
  });
  
  describe('extractInvoiceData', () => {
    test('should extract product code, quantity and price from OCR text', async () => {
      const result = await invoiceProcessor.extractInvoiceData('dummy.pdf');
      
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty('product');
      expect(result.items[0]).toHaveProperty('count');
      expect(result.items[0]).toHaveProperty('price');
    });
  });
  
  describe('convertToInventoryFormat', () => {
    test('should convert invoice data to inventory update format', () => {
      const invoiceData = {
        invoiceId: 'INV-123',
        invoiceDate: '2023-01-01',
        supplier: 'Test Supplier',
        items: [
          { product: 'Vodka Grey Goose', count: 5, price: '149.95' },
          { product: 'Wine Cabernet', count: 10, price: '89.95' }
        ]
      };
      
      const result = invoiceProcessor.convertToInventoryFormat(invoiceData);
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(2);
      expect(result.invoiceId).toBe('INV-123');
      expect(result.date).toBe('2023-01-01');
      expect(result.supplier).toBe('Test Supplier');
      expect(result.items[0].product_name).toBe('Vodka Grey Goose');
      expect(result.items[0].quantity).toBe(5);
    });
=======
/**
 * Unit tests for invoice-processor module
 */
const fs = require('fs').promises;
const invoiceProcessor = require('../../../modules/invoice-processor');
const ocrService = require('../../../modules/ocr-service');
const translationService = require('../../../modules/translation-service');

// Mocking dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock invoice content'))
  }
}));

jest.mock('../../../modules/ocr-service', () => ({
  extractTextFromPdf: jest.fn().mockResolvedValue(`Invoice #12345
Date: 2023-10-15
Items:
5 bottles of Wine - 10000 JPY
2 boxes of Beer - 5000 JPY
Total: 15000 JPY`),
  extractTextFromImage: jest.fn().mockResolvedValue('mock OCR text')
}));

jest.mock('../../../modules/translation-service', () => ({
  detectLanguage: jest.fn().mockResolvedValue('en'),
  translate: jest.fn().mockImplementation((text) => Promise.resolve(`Translated: ${text}`))
}));

describe('Invoice Processor Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('extractInvoiceData should extract data from an invoice file', async () => {
    const result = await invoiceProcessor.extractInvoiceData('invoice.pdf');
    
    expect(result).toBeDefined();
    expect(result.invoiceId).toBe('12345');
    expect(result.invoiceDate).toBe('2023-10-15');
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe('15000 JPY');
    expect(fs.readFile).toHaveBeenCalledWith('invoice.pdf');
    expect(ocrService.extractTextFromPdf).toHaveBeenCalled();
  });
  
  test('processInvoice should process an invoice and return structured data', async () => {
    const result = await invoiceProcessor.processInvoice('invoice.pdf');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.extractedData).toBeDefined();
    expect(result.extractedData.invoiceId).toBe('12345');
    expect(fs.readFile).toHaveBeenCalledWith('invoice.pdf');
    expect(ocrService.extractTextFromPdf).toHaveBeenCalled();
    expect(translationService.detectLanguage).toHaveBeenCalled();
  });
  
  test('parseInvoiceText should extract structured data from text', () => {
    const text = `Invoice #54321
Date: 2023-11-10
Items:
Wine - 10 bottles - 20000 JPY
Beer (5 boxes) - 10000 JPY
Total: 30000 JPY`;
    
    const result = invoiceProcessor.parseInvoiceText(text);
    
    expect(result).toBeDefined();
    expect(result.invoiceId).toBe('54321');
    expect(result.invoiceDate).toBe('2023-11-10');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].product).toBe('Wine');
    expect(result.items[0].count).toBe(10);
    expect(result.items[1].product).toBe('Beer');
    expect(result.items[1].count).toBe(5);
  });
  
  test('extractInventoryUpdates should convert invoice data to inventory format', () => {
    const invoiceData = {
      invoiceId: '12345',
      invoiceDate: '2023-10-15',
      items: [
        { product: 'Wine', count: 5, unit: 'bottle' },
        { product: 'Beer', count: 2, unit: 'box' }
      ]
    };
    
    const result = invoiceProcessor.extractInventoryUpdates(invoiceData);
    
    expect(result).toBeDefined();
    expect(result.action).toBe('add');
    expect(result.date).toBe('2023-10-15');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Wine');
    expect(result.items[0].quantity).toBe(5);
    expect(result.items[1].name).toBe('Beer');
    expect(result.items[1].quantity).toBe(2);
>>>>>>> backup-main
  });
});
