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
  });
});
