/**
 * Unit tests for invoice-processor module
 */
const fs = require('fs').promises;
const invoiceProcessor = require('../../modules/invoice-processor');
const ocrService = require('../../modules/ocr-service');
const translationService = require('../../modules/translation-service');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock invoice content'))
  }
}));

jest.mock('../../modules/ocr-service', () => ({
  extractTextFromPdf: jest.fn().mockResolvedValue(`Invoice #12345
Date: 2023-10-15
Items:
5 bottles of Wine - 10000 JPY
2 boxes of Beer - 5000 JPY
Total: 15000 JPY`),
  extractTextFromImage: jest.fn().mockResolvedValue('mock OCR text')
}));

jest.mock('../../modules/translation-service', () => ({
  detectLanguage: jest.fn().mockResolvedValue('en'),
  translate: jest.fn().mockImplementation((text) => Promise.resolve(`Translated: ${text}`))
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Invoice Processor Module (Unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('extractInvoiceData should extract data from an invoice file', async () => {
    const result = await invoiceProcessor.extractInvoiceData('invoice.pdf');
    expect(result).toBeDefined();
    expect(result.invoiceId).toBe('12345');
    expect(result.invoiceDate).toBe('2023-10-15');
    expect(result.items).toBeInstanceOf(Array);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe('15000 JPY');
    expect(fs.readFile).toHaveBeenCalledWith('invoice.pdf');
    expect(ocrService.extractTextFromPdf).toHaveBeenCalled();
  });

  test('processInvoice should process an invoice and return structured data', async () => {
    const parseSpy = jest.spyOn(invoiceProcessor, 'parseInvoiceText').mockImplementation(() => ({
      invoiceId: '12345',
      invoiceDate: '2023-10-15',
      items: [{ product: 'Wine', count: 5, price: 100 }, { product: 'Beer', count: 2, price: 50 }],
      total: '15000 JPY'
    }));

    const result = await invoiceProcessor.processInvoice('invoice.pdf');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);

    // Accept both result.items and result.extractedData.items for compatibility
    const items = result.items || (result.extractedData && result.extractedData.items);
    expect(items).toBeInstanceOf(Array);
    expect(items).toHaveLength(2);
    expect(result.invoiceDate || (result.extractedData && result.extractedData.invoiceDate)).toBe('2023-10-15');
    expect(result.total || (result.extractedData && result.extractedData.total)).toBe('15000 JPY');
    expect(fs.readFile).toHaveBeenCalledWith('invoice.pdf');
    expect(ocrService.extractTextFromPdf).toHaveBeenCalled();
    expect(translationService.detectLanguage).toHaveBeenCalled();

    parseSpy.mockRestore();
  });

  test('parseInvoiceText should extract structured data from text', () => {
    // Restore the original implementation for this test
    if (invoiceProcessor.parseInvoiceText.mockRestore) {
      invoiceProcessor.parseInvoiceText.mockRestore();
    }
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
  });
});
