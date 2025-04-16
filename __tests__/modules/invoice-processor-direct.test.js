/**
 * Direct tests for invoice-processor module
 */
const fs = require('fs').promises;
const path = require('path');
const invoiceProcessor = require('../../modules/invoice-processor');

// Mock required dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock invoice content'))
  }
}));

jest.mock('../../modules/ocr-service', () => ({ // Changed from ../../../modules/ocr-service
  extractTextFromPdf: jest.fn().mockResolvedValue(`Invoice #12345
Date: 2023-10-15
Items:
5 bottles of Wine - 10000 JPY
2 boxes of Beer - 5000 JPY
Total: 15000 JPY`),
  extractTextFromImage: jest.fn().mockResolvedValue('mock OCR text')
}));

jest.mock('../../modules/translation-service', () => ({ // Changed from ../../../modules/translation-service
  detectLanguage: jest.fn().mockResolvedValue('en'),
  translate: jest.fn().mockImplementation((text) => Promise.resolve(`Translated: ${text}`))
}));

jest.mock('../../utils/logger', () => ({ // Changed from ../../../utils/logger
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Invoice Processor Direct Test', () => {
  test('should expose the expected methods', () => {
    expect(typeof invoiceProcessor.processInvoice).toBe('function');
    expect(typeof invoiceProcessor.extractInvoiceData).toBe('function');
    expect(typeof invoiceProcessor.convertToInventoryFormat).toBe('function');
  });
  
  test('processInvoice should handle PDF data', async () => {
    const result = await invoiceProcessor.processInvoice('test.pdf');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.extractedData).toBeDefined();
    expect(result.extractedData.invoiceId).toBe('12345');
  });
  
  test('parseInvoiceText should extract structured data', () => {
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
  
  test('convertToInventoryFormat should transform invoice data', () => {
    const invoiceData = {
      invoiceId: '12345',
      invoiceDate: '2023-10-15',
      items: [
        { product: 'Wine', count: 5, unit: 'bottle' },
        { product: 'Beer', count: 2, unit: 'box' }
      ]
    };
    
    const result = invoiceProcessor.convertToInventoryFormat(invoiceData);
    
    expect(result).toBeDefined();
    expect(result.action).toBe('add');
    expect(result.date).toBe('2023-10-15');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Wine');
    expect(result.items[0].quantity).toBe(5);
    expect(result.items[1].name).toBe('Beer');
    expect(result.items[1].quantity).toBe(2);
  });
});
