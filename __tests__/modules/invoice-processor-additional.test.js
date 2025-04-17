/**
 * Additional tests for invoice-processor.js to increase coverage
 */
const fs = require('fs').promises;
const invoiceProcessor = require('../../modules/invoice-processor');
const ocrService = require('../../modules/ocr-service');
const translationService = require('../../modules/translation-service');
const path = require('path');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock invoice content'))
  }
}));

jest.mock('path', () => ({
  extname: jest.fn().mockImplementation(filePath => {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  })
}));

jest.mock('../../modules/ocr-service', () => ({
  extractTextFromPdf: jest.fn().mockResolvedValue('Invoice #12345\nDate: 2023-10-15\nItems:\n10 bottles of wine - 100 USD\nTotal: 100 USD'),
  extractTextFromImage: jest.fn().mockResolvedValue('Invoice #67890\nDate: 2023-11-20\nItems:\n5 cases of beer - 50 EUR\nTotal: 50 EUR'),
  cleanup: jest.fn().mockImplementation(text => text)
}));

jest.mock('../../modules/translation-service', () => ({
  detectLanguage: jest.fn().mockResolvedValue('en'),
  translate: jest.fn().mockImplementation((text) => Promise.resolve(text)),
  translateItems: jest.fn().mockImplementation(items => Promise.resolve(items))
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Invoice Processor Additional Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('processInvoice', () => {
    test('should handle unsupported file formats', async () => {
      path.extname.mockReturnValueOnce('.txt');
      
      const result = await invoiceProcessor.processInvoice('invoice.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });
    
    test('should handle image file formats', async () => {
      path.extname.mockReturnValueOnce('.jpg');
      
      const result = await invoiceProcessor.processInvoice('invoice.jpg');
      
      expect(result.success).toBe(true);
      expect(ocrService.extractTextFromImage).toHaveBeenCalled();
    });
  });
  
  describe('parseInvoiceText', () => {
    test('should extract quantity with parentheses format', () => {
      const text = 'Invoice #12345\nDate: 2023-10-15\nItems:\nWine (10 bottles) - 100 USD';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.items[0].count).toBe(10);
      expect(result.items[0].product).toBe('Wine');
    });
    
    test('should extract quantity with "X units of" format', () => {
      const text = 'Invoice #12345\nDate: 2023-10-15\nItems:\n10 bottles of Wine - 100 USD';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.items[0].count).toBe(10);
      expect(result.items[0].product).toBe('Wine');
    });
    
    test('should handle multiple date formats', () => {
      // Test MM/DD/YYYY format
      const text1 = 'Invoice #12345\nDate: 10/15/2023\nItems:\nWine - 100 USD';
      const result1 = invoiceProcessor.parseInvoiceText(text1);
      expect(result1.invoiceDate).toBe('2023-10-15');
      
      // Test DD.MM.YYYY format
      const text2 = 'Invoice #12345\nDate: 15.10.2023\nItems:\nWine - 100 USD';
      const result2 = invoiceProcessor.parseInvoiceText(text2);
      expect(result2.invoiceDate).toBe('2023-10-15');
      
      // Test month name format
      const text3 = 'Invoice #12345\nDate: October 15, 2023\nItems:\nWine - 100 USD';
      const result3 = invoiceProcessor.parseInvoiceText(text3);
      expect(result3.invoiceDate).toBe('2023-10-15');
    });
  });
  
  describe('extractInventoryUpdates', () => {
    test('should handle empty items array', () => {
      const invoiceData = {
        invoiceId: '12345',
        invoiceDate: '2023-10-15',
        items: []
      };
      
      const result = invoiceProcessor.extractInventoryUpdates(invoiceData);
      
      expect(result.items).toEqual([]);
      expect(result.date).toBe('2023-10-15');
      expect(result.action).toBe('add');
    });
    
    test('should handle items with different property names', () => {
      const invoiceData = {
        invoiceId: '12345',
        invoiceDate: '2023-10-15',
        items: [
          { product_name: 'Wine', quantity: 10 },
          { name: 'Beer', count: 5 }
        ]
      };
      
      const result = invoiceProcessor.extractInventoryUpdates(invoiceData);
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('Wine');
      expect(result.items[0].quantity).toBe(10);
      expect(result.items[1].name).toBe('Beer');
      expect(result.items[1].quantity).toBe(5);
    });
  });
});
