// Direct test for invoice processor to measure coverage
const invoiceProcessor = require('../../modules/invoice-processor');

// Mock dependencies but not the module itself
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue({}),
    loadLanguage: jest.fn().mockResolvedValue({}),
    initialize: jest.fn().mockResolvedValue({}),
    setParameters: jest.fn().mockResolvedValue({}),
    recognize: jest.fn().mockResolvedValue({
      data: { text: 'Sample invoice text', confidence: 95 }
    }),
    terminate: jest.fn().mockResolvedValue({})
  }))
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Invoice Processor Direct Test', () => {
  test('should expose the expected methods', () => {
    expect(invoiceProcessor).toBeDefined();
    expect(typeof invoiceProcessor.processInvoice).toBe('function');
    expect(typeof invoiceProcessor.extractInvoiceData).toBe('function');
    expect(typeof invoiceProcessor.convertToInventoryFormat).toBe('function');
  });
  
  // Add simple test for each method
  test('processInvoice should handle PDF data', async () => {
    const result = await invoiceProcessor.processInvoice('test.pdf', Buffer.from('test'));
    expect(result).toBeDefined();
  });
});
