/**
 * Tests for invoice-processor module
 */
const fs = require('fs').promises;
const path = require('path');
const invoiceProcessor = require('../../../modules/invoice-processor');
const ocrService = require('../../../modules/ocr-service');
const translationService = require('../../../modules/translation-service');
const logger = require('../../../utils/logger');
const { ExternalServiceError } = require('../../../utils/error-handler');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    access: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../../modules/ocr-service', () => ({
  extractTextFromPdf: jest.fn(),
  extractTextFromImage: jest.fn()
}));

jest.mock('../../../modules/translation-service', () => ({
  translate: jest.fn(),
  translateItems: jest.fn(),
  detectLanguage: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Invoice Processor Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processInvoice', () => {
    test('should process a PDF invoice successfully', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockResolvedValueOnce(`Invoice #12345
Date: 2023-10-15
Items:
5 bottles of Wine - 10000 JPY
2 boxes of Beer - 5000 JPY
Total: 15000 JPY`);
      
      translationService.translate.mockResolvedValueOnce(`Invoice #12345
Date: October 15, 2023
Items:
5 bottles of Wine - 100 USD
2 boxes of Beer - 50 USD
Total: 150 USD`);

      translationService.detectLanguage.mockResolvedValueOnce('ja');
      
      // Act
      const result = await invoiceProcessor.processInvoice(filePath);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.extractedData).toBeDefined();
      expect(result.translation).toBeDefined();
      expect(fs.readFile).toHaveBeenCalledWith(filePath);
      expect(ocrService.extractTextFromPdf).toHaveBeenCalled();
      expect(translationService.translate).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Processing invoice'));
    });
    
    test('should process an image invoice successfully', async () => {
      // Arrange
      const filePath = '/path/to/invoice.jpg';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock image content'));
      
      ocrService.extractTextFromImage.mockResolvedValueOnce(`Invoice #12345
Date: 2023-10-15
Items:
5 bottles of Wine - 10000 JPY
2 boxes of Beer - 5000 JPY
Total: 15000 JPY`);
      
      translationService.translate.mockResolvedValueOnce(`Invoice #12345
Date: October 15, 2023
Items:
5 bottles of Wine - 100 USD
2 boxes of Beer - 50 USD
Total: 150 USD`);
      
      // Act
      const result = await invoiceProcessor.processInvoice(filePath);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.extractedData).toBeDefined();
      expect(result.translation).toBeDefined();
      expect(fs.readFile).toHaveBeenCalledWith(filePath);
      expect(ocrService.extractTextFromImage).toHaveBeenCalled();
      expect(translationService.translate).toHaveBeenCalled();
    });
    
    test('should handle files with unsupported extensions', async () => {
      // Arrange
      const filePath = '/path/to/invoice.txt';
      
      // Act & Assert
      await expect(invoiceProcessor.processInvoice(filePath)).rejects.toThrow('Unsupported file type');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Unsupported file type'));
    });
    
    test('should handle OCR service errors', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockRejectedValueOnce(new Error('OCR service failed'));
      
      // Act & Assert
      await expect(invoiceProcessor.processInvoice(filePath)).rejects.toThrow('OCR service failed');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing invoice'));
    });
    
    test('should handle translation service errors', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockResolvedValueOnce('mock ocr text');
      translationService.translate.mockRejectedValueOnce(new Error('Translation service failed'));
      
      // Act & Assert
      await expect(invoiceProcessor.processInvoice(filePath)).rejects.toThrow('Translation service failed');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing invoice'));
    });
    
    test('should handle file read errors', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockRejectedValueOnce(new Error('File not found'));
      
      // Act & Assert
      await expect(invoiceProcessor.processInvoice(filePath)).rejects.toThrow('File not found');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing invoice'));
    });
  });

  describe('processInvoice language "en"', () => {
    test('should not invoke translation when detected language is en', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      // Simulate file read and OCR extraction that yields English text.
      fs.readFile.mockResolvedValueOnce(Buffer.from('Invoice #999\nDate: 2023-12-01\nItems:\n1 bottle of Wine - 100 USD\nTotal: 100 USD'));
      ocrService.extractTextFromPdf.mockResolvedValueOnce(`Invoice #999
Date: 2023-12-01
Items:
1 bottle of Wine - 100 USD
Total: 100 USD`);
      translationService.detectLanguage.mockResolvedValueOnce('en');
      // Act
      const result = await invoiceProcessor.processInvoice(filePath);
      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sourceLanguage).toBe('en');
      // Translation should not change text because source is already English
      expect(translationService.translate).not.toHaveBeenCalled();
    });
  });

  describe('extractInvoiceData', () => {
    test('should extract data from PDF invoice', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockResolvedValueOnce(`Invoice #12345
Date: 2023-10-15
Items:
5 bottles of Wine - 10000 JPY
2 boxes of Beer - 5000 JPY
Total: 15000 JPY`);
      
      // Act
      const data = await invoiceProcessor.extractInvoiceData(filePath);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.invoiceId).toBe('12345');
      expect(data.invoiceDate).toBe('2023-10-15');
      expect(data.items).toHaveLength(2);
      expect(data.total).toBe('15000 JPY');
    });
    
    test('should extract different date formats correctly', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockResolvedValueOnce(`Invoice #12345
Date: 15/10/2023
Items:
5 bottles of Wine - 10000 JPY
Total: 10000 JPY`);
      
      // Act
      const data = await invoiceProcessor.extractInvoiceData(filePath);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.invoiceDate).toBe('2023-10-15'); // Should be normalized to YYYY-MM-DD
    });
    
    test('should extract Japanese date formats correctly', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockResolvedValueOnce(`請求書 #12345
日付: 2023年10月15日
商品:
ワイン 5本 - 10000円
合計: 10000円`);
      
      // Act
      const data = await invoiceProcessor.extractInvoiceData(filePath);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.invoiceDate).toBe('2023-10-15'); // Should be normalized
    });
    
    test('should extract items with various formats', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockResolvedValueOnce(`Invoice #12345
Date: 2023-10-15
Items:
Wine - 5 bottles - 10000 JPY
Beer (2 boxes) - 5000 JPY
Whisky x 3 bottles - 15000 JPY
Total: 30000 JPY`);
      
      // Act
      const data = await invoiceProcessor.extractInvoiceData(filePath);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.items).toHaveLength(3);
      expect(data.items[0].product).toBe('Wine');
      expect(data.items[0].count).toBe(5);
      expect(data.items[1].product).toBe('Beer');
      expect(data.items[1].count).toBe(2);
      expect(data.items[2].product).toBe('Whisky');
      expect(data.items[2].count).toBe(3);
    });
    
    test('should handle invoices with missing information', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockResolvedValueOnce(`Invoice
Items:
Wine - 5 bottles
Beer - 2 boxes
Total: 15000 JPY`);
      
      // Act
      const data = await invoiceProcessor.extractInvoiceData(filePath);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.invoiceId).toBeUndefined(); // No invoice ID in text
      expect(data.invoiceDate).toBeUndefined(); // No date in text
      expect(data.items).toHaveLength(2);
      expect(data.total).toBe('15000 JPY');
    });
    
    test('should handle empty or unrecognizable text', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      fs.readFile.mockResolvedValueOnce(Buffer.from('mock pdf content'));
      
      ocrService.extractTextFromPdf.mockResolvedValueOnce('Unrecognizable text');
      
      // Act
      const data = await invoiceProcessor.extractInvoiceData(filePath);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.items).toEqual([]);
      expect(data.raw).toBe('Unrecognizable text');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not extract structured data'));
    });
  });

  describe('getProcessingHistory', () => {
    test('should return invoice processing history', async () => {
      // Since this likely depends on database or file storage, 
      // we'll just check it returns something and doesn't throw
      const history = await invoiceProcessor.getProcessingHistory();
      
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('parseInvoiceText', () => {
    test('should parse structured data from invoice text', () => {
      // Arrange
      const text = `Invoice #12345
Date: 2023-10-15
Items:
5 bottles of Wine - 10000 JPY
2 boxes of Beer - 5000 JPY
Total: 15000 JPY`;
      
      // Act
      const data = invoiceProcessor.parseInvoiceText(text);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.invoiceId).toBe('12345');
      expect(data.invoiceDate).toBe('2023-10-15');
      expect(data.items).toHaveLength(2);
      expect(data.total).toBe('15000 JPY');
    });
    
    test('should handle text with multiple date formats', () => {
      // Arrange
      const text = `Invoice #12345
Issued: 15/10/2023
Due Date: October 15, 2023
Items:
5 bottles of Wine - 10000 JPY
Total: 10000 JPY`;
      
      // Act
      const data = invoiceProcessor.parseInvoiceText(text);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.invoiceDate).toBe('2023-10-15'); // Should take the first date found
    });
    
    test('should extract currency information', () => {
      // Arrange
      const text = `Invoice #12345
Date: 2023-10-15
Items:
5 bottles of Wine - 100 USD
2 boxes of Beer - 50 USD
Total: 150 USD`;
      
      // Act
      const data = invoiceProcessor.parseInvoiceText(text);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.currency).toBe('USD');
      expect(data.items[0].price).toBe('100 USD');
    });
    
    test('should handle Japanese text with appropriate item extraction', () => {
      // Arrange
      const text = `請求書 #12345
日付: 2023年10月15日
商品:
ワイン 5本 - 10000円
ビール 2箱 - 5000円
合計: 15000円`;
      
      // Act
      const data = invoiceProcessor.parseInvoiceText(text);
      
      // Assert
      expect(data).toBeDefined();
      expect(data.invoiceId).toBe('12345');
      expect(data.items).toHaveLength(2);
      expect(data.items[0].product).toBe('ワイン');
      expect(data.items[0].count).toBe(5);
      expect(data.currency).toBe('JPY');
    });
  });

  describe('extractInventoryUpdates', () => {
    test('should extract inventory updates from invoice data', () => {
      // Arrange
      const invoiceData = {
        invoiceDate: '2023-10-15',
        items: [
          { product: 'Wine', count: 5, price: '100 USD' },
          { product: 'Beer', count: 2, price: '50 USD' }
        ],
        total: '150 USD'
      };
      
      // Act
      const updates = invoiceProcessor.extractInventoryUpdates(invoiceData);
      
      // Assert
      expect(updates).toBeDefined();
      expect(updates.items).toHaveLength(2);
      expect(updates.date).toBe('2023-10-15');
      expect(updates.action).toBe('add');
      expect(updates.items[0].sku).toContain('wine');
      expect(updates.items[0].quantity).toBe(5);
    });
    
    test('should handle missing or invalid data', () => {
      // Arrange
      const invoiceData = {
        // Missing date
        items: [] // Empty items
      };
      
      // Act
      const updates = invoiceProcessor.extractInventoryUpdates(invoiceData);
      
      // Assert
      expect(updates).toBeDefined();
      expect(updates.items).toEqual([]);
      expect(updates.date).toBeUndefined();
    });
  });

  describe('Additional Invoice Processor Tests', () => {
    // Test non-string input for parseInvoiceText
    test('parseInvoiceText should return empty items for non-string input', () => {
      const dataNull = invoiceProcessor.parseInvoiceText(null);
      expect(dataNull).toEqual({ items: [] });
      const dataNumber = invoiceProcessor.parseInvoiceText(12345);
      expect(dataNumber).toEqual({ items: [] });
    });
  
    // Verify the alias function convertToInventoryFormat behaves the same as extractInventoryUpdates
    test('convertToInventoryFormat should alias extractInventoryUpdates', () => {
      const invoiceData = {
        invoiceDate: '2023-10-15',
        items: [
          { product: 'Wine', count: 5, unit: 'bottle' }
        ]
      };
      const result1 = invoiceProcessor.extractInventoryUpdates(invoiceData);
      const result2 = invoiceProcessor.convertToInventoryFormat(invoiceData);
      expect(result2).toEqual(result1);
    });
  });
});
