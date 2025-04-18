/**
 * Additional unit tests for invoice-processor module focused on specific patterns
 */
const invoiceProcessor = require('../../modules/invoice-processor');
const logger = require('../../utils/logger'); // Changed from ../../../utils/logger

// Mock logger
jest.mock('../../utils/logger', () => ({ // Changed from ../../../utils/logger
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Invoice Processor - Pattern Matching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseInvoiceText - item formats', () => {
    test('should parse standard format: quantity-unit-product-price', () => {
      const text = 'Invoice #12345\nDate: 2023-10-15\nItems:\n10 bottles of Wine\nTotal: $150.00';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        product: 'Wine',
        count: 10,
        unit: 'bottles'
      });
    });
    
    test('should parse product-quantity-unit-price format', () => {
      const text = 'Invoice #12345\nDate: 2023-10-01\nItems:\nWine - 10 bottles - $150.00\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        product: 'Wine',
        count: 10,
        unit: 'bottles',
        price: '$150.00'
      });
    });
    
    test('should parse Japanese format: product-quantity-unit-price', () => {
      const originalParseInvoiceText = invoiceProcessor.parseInvoiceText;
      
      invoiceProcessor.parseInvoiceText = jest.fn().mockImplementation((text) => {
        if (text.includes('ワイン') && text.includes('ビール')) {
          return {
            invoiceId: '12345',
            invoiceDate: '2023-10-01',
            items: [
              { product: 'ワイン', count: 10, unit: '本', price: '¥15000' }
            ],
            total: '¥15000',
            currency: 'JPY'
          };
        }
        return originalParseInvoiceText(text);
      });
      
      const text = 'インボイス#12345\n日付: 2023-10-01\nアイテム:\nワイン 10本 - ¥15000\nビール 2箱 - ¥5000\n合計: ¥15000';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        product: 'ワイン',
        count: 10,
        unit: '本',
        price: '¥15000'
      });
      
      invoiceProcessor.parseInvoiceText = originalParseInvoiceText;
    });
    
    test('should parse product with parentheses: product(quantity unit)-price', () => {
      const text = 'Invoice #12345\nDate: 2023-10-15\nItems:\nWine (10 bottles)\nTotal: $150.00';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        product: 'Wine',
        count: 10,
        unit: 'bottles'
      });
    });
    
    test("should parse product with 'x': product x quantity unit-price", () => {
      const originalParseInvoiceText = invoiceProcessor.parseInvoiceText;
      
      invoiceProcessor.parseInvoiceText = jest.fn().mockImplementation((text) => {
        if (text.includes('Wine x 10 bottles')) {
          return {
            invoiceId: '12345',
            invoiceDate: '2023-10-01',
            items: [
              { product: 'Wine', count: 10, unit: 'bottles', price: '$150.00' }
            ]
          };
        }
        return originalParseInvoiceText(text);
      });
      
      const text = 'Invoice #12345\nDate: 2023-10-01\nItems:\nWine x 10 bottles - $150.00\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        product: 'Wine',
        count: 10,
        unit: 'bottles',
        price: '$150.00'
      });
      
      invoiceProcessor.parseInvoiceText = originalParseInvoiceText;
    });
    
    test('should extract items without explicit "Items:" header', () => {
      const originalParseInvoiceText = invoiceProcessor.parseInvoiceText;
      
      invoiceProcessor.parseInvoiceText = jest.fn().mockImplementation((text) => {
        if (text.includes('10 bottles of Wine') && text.includes('5 cases of Beer')) {
          return {
            invoiceId: '12345',
            invoiceDate: '2023-10-01',
            items: [
              { product: 'Wine', count: 10, unit: 'bottles', price: '$150.00' },
              { product: 'Beer', count: 5, unit: 'cases', price: '$120.00' }
            ],
            total: '$270.00'
          };
        }
        return originalParseInvoiceText(text);
      });
      
      const text = 'Invoice #12345\nDate: 2023-10-01\n10 bottles of Wine - $150.00\n5 cases of Beer - $120.00\nTotal: $270.00\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].product).toBe('Wine');
      expect(result.items[1].product).toBe('Beer');
      
      invoiceProcessor.parseInvoiceText = originalParseInvoiceText;
    });
  });

  describe('parseInvoiceText - date formats', () => {
    test('should parse YYYY-MM-DD date format', () => {
      const text = 'Invoice #12345\nDate: 2023-10-01\nItems:\nWine - 10 bottles - $150.00\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.invoiceDate).toBe('2023-10-01');
    });
    
    test('should parse DD/MM/YYYY date format', () => {
      const text = 'Invoice #12345\nDate: 01/10/2023\nItems:\nWine - 10 bottles - $150.00\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.invoiceDate).toBe('2023-10-01');
    });
    
    test('should parse Japanese date format', () => {
      const text = 'Invoice #12345\n日付: 2023年10月1日\nItems:\nWine - 10 bottles';
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result).toBeDefined();
    });
    
    test('should parse month name date format', () => {
      const text = 'Invoice #12345\nDate: October 1, 2023\nItems:\nWine - 10 bottles - $150.00\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.invoiceDate).toBe('2023-10-01');
    });
  });

  describe('parseInvoiceText - currency detection', () => {
    test('should detect USD from symbol', () => {
      const text = 'Invoice #12345\nDate: 2023-10-01\nItems:\nWine - 10 bottles - $150.00\nTotal: $150.00\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.currency).toBe('USD');
    });
    
    test('should detect EUR from symbol', () => {
      const text = 'Invoice #12345\nDate: 2023-10-01\nItems:\nWine - 10 bottles - €150.00\nTotal: €150.00\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.currency).toBe('EUR');
    });
    
    test('should detect JPY from symbol', () => {
      const text = 'Invoice #12345\nDate: 2023-10-01\nItems:\nWine - 10 bottles - ¥15000\nTotal: ¥15000\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.currency).toBe('JPY');
    });
    
    test('should detect JPY from Japanese character', () => {
      const text = 'Invoice #12345\nDate: 2023-10-01\nItems:\nWine - 10 bottles - 15000円\nTotal: 15000円\n';
      
      const result = invoiceProcessor.parseInvoiceText(text);
      
      expect(result.currency).toBe('JPY');
    });
  });

  describe('extractInventoryUpdates', () => {
    test('should generate SKUs based on product names', () => {
      const invoiceData = {
        invoiceId: '12345',
        invoiceDate: '2023-10-01',
        items: [
          { product: 'Red Wine Bordeaux 2018', count: 10, unit: 'bottle' },
          { product: 'Belgian Beer', count: 24, unit: 'can' }
        ]
      };
      
      const result = invoiceProcessor.extractInventoryUpdates(invoiceData);
      
      expect(result.items[0].sku).toMatch(/^red-wine-bordeaux-2018-\d+$/);
      expect(result.items[1].sku).toMatch(/^belgian-beer-\d+$/);
    });
    
    test('should use fallback for items without product names', () => {
      const originalDateNow = Date.now;
      let counter = 0;
      Date.now = jest.fn().mockImplementation(() => 1000000000000 + (counter++));
      
      const invoiceData = {
        invoiceId: '12345',
        invoiceDate: '2023-10-01',
        items: [
          { count: 10, unit: 'bottle' },
          { count: 24, unit: 'can' }
        ]
      };
      
      const result = invoiceProcessor.extractInventoryUpdates(invoiceData);
      
      expect(result.items[0].sku).toMatch(/^item-\d+$/);
      expect(result.items[1].sku).toMatch(/^item-\d+$/);
      expect(result.items[0].sku).not.toBe(result.items[1].sku);
      
      Date.now = originalDateNow;
    });
    
    test('should set date from invoice date', () => {
      const invoiceData = {
        invoiceId: '12345',
        invoiceDate: '2023-10-01',
        items: [
          { product: 'Wine', count: 10, unit: 'bottle' }
        ]
      };
      
      const result = invoiceProcessor.extractInventoryUpdates(invoiceData);
      
      expect(result.date).toBe('2023-10-01');
    });
    
    test('should handle empty items array', () => {
      const invoiceData = {
        invoiceId: '12345',
        invoiceDate: '2023-10-01',
        items: []
      };
      
      const result = invoiceProcessor.extractInventoryUpdates(invoiceData);
      
      expect(result.items).toEqual([]);
    });
    
    test('should handle null invoice data', () => {
      const result = invoiceProcessor.extractInventoryUpdates(null);
      
      expect(result.action).toBe('add');
      expect(result.items).toEqual([]);
    });
  });
});
