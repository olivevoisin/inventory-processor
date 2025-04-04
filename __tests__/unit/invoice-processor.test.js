const invoiceProcessor = require('../../modules/invoice-processor');
const fs = require('fs').promises;

// Mock du module de journalisation
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock du module fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
    access: jest.fn().mockResolvedValue(true)
  }
}));

describe('Invoice Processor Module', () => {
  // Test de la fonction extractInvoiceData
  describe('extractInvoiceData', () => {
    it('should extract data from an invoice file', async () => {
      // Arrange
      const filePath = 'test-invoice.pdf';
      
      // Act
      const result = await invoiceProcessor.extractInvoiceData(filePath);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty('product');
      expect(result.items[0]).toHaveProperty('count');
      expect(result.items[0]).toHaveProperty('price');
      expect(result.invoiceDate).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });
  
  // Test de la fonction processInvoice
  describe('processInvoice', () => {
    it('should process an invoice and return structured data', async () => {
      // Arrange
      const filePath = 'test-invoice.pdf';
      const location = 'Bar';
      
      // Act
      const result = await invoiceProcessor.processInvoice(filePath, location);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.invoiceDate).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.location).toBe(location);
    });
  });
});
