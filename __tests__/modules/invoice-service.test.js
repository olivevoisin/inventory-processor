// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn().mockResolvedValue(['invoice1.pdf', 'invoice2.pdf', 'notaninvoice.txt']),
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock pdf content')),
    unlink: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    rename: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../modules/invoice-processor', () => ({
  processIncomingInvoices: jest.fn().mockResolvedValue({
    processed: 2,
    errors: 0,
    items: [{ product: 'Product A', quantity: 5 }]
  }),
  convertToInventoryFormat: jest.fn().mockReturnValue({
    items: [{ product: 'Product A', quantity: 5 }]
  }),
  processInvoice: jest.fn().mockResolvedValue({
    invoiceId: 'INV-001',
    supplier: 'Test Supplier',
    date: '2023-09-15',
    items: [{ product: 'Product A', quantity: 5 }]
  })
}));

jest.mock('../../modules/translation-service', () => ({
  translateItems: jest.fn().mockImplementation((items) => Promise.resolve(
    items.map(item => ({
      ...item,
      product_name: `[Translated] ${item.product}`,
      original_name: item.product
    }))
  ))
}));

jest.mock('../../utils/database-utils', () => ({
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true, savedCount: 1 }),
  saveInvoice: jest.fn().mockResolvedValue({ id: 'INV-001' })
}));

jest.mock('../../config', () => ({
  uploads: {
    invoiceDir: '/mock/invoice/dir'
  },
  invoiceProcessing: {
    schedule: '0 0 * * *'
  }
}));

// Import after mocks are set up
const invoiceService = require('../../modules/invoice-service');
const fs = require('fs');
const invoiceProcessor = require('../../modules/invoice-processor');
const translationService = require('../../modules/translation-service');
const databaseUtils = require('../../utils/database-utils');
const logger = require('../../utils/logger');
const path = require('path');

describe('Invoice Service Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('processIncomingInvoices function', () => {
    test('calls invoice processor with default directory', async () => {
      await invoiceService.processIncomingInvoices();
      expect(invoiceProcessor.processIncomingInvoices).toHaveBeenCalledWith('/mock/invoice/dir');
    });

    test('calls invoice processor with custom directory', async () => {
      await invoiceService.processIncomingInvoices('/custom/dir');
      expect(invoiceProcessor.processIncomingInvoices).toHaveBeenCalledWith('/custom/dir');
    });

    test('returns result from invoice processor', async () => {
      const result = await invoiceService.processIncomingInvoices();
      expect(result).toEqual({
        processed: 2,
        errors: 0,
        items: [{ product: 'Product A', quantity: 5 }]
      });
    });
  });

  describe('processInvoices function', () => {
    test('processes multiple invoice files successfully', async () => {
      const result = await invoiceService.processInvoices('/source/dir', '/processed/dir');
      
      expect(fs.promises.mkdir).toHaveBeenCalledWith('/processed/dir', { recursive: true });
      expect(fs.promises.readdir).toHaveBeenCalledWith('/source/dir');
      expect(fs.promises.rename).toHaveBeenCalledTimes(2);
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
    });

    test('handles errors during invoice processing', async () => {
      // Mock first invoice to throw an error
      invoiceProcessor.processInvoice.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = await invoiceService.processInvoices('/source/dir', '/processed/dir');
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.errors).toBe(1);
      expect(logger.error).toHaveBeenCalled();
    });

    test('handles no invoice files found', async () => {
      fs.promises.readdir.mockResolvedValueOnce(['notaninvoice.txt']);
      
      const result = await invoiceService.processInvoices('/source/dir', '/processed/dir');
      
      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
    });

    test('handles directory errors', async () => {
      fs.promises.readdir.mockRejectedValueOnce(new Error('Directory error'));
      
      const result = await invoiceService.processInvoices('/source/dir', '/processed/dir');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('saveInvoiceToInventory function', () => {
    test('saves invoice data with items', async () => {
      const invoiceData = {
        invoiceId: 'INV-001',
        items: [{ product: 'Product A', quantity: 5 }]
      };
      
      const result = await invoiceService.saveInvoiceToInventory(invoiceData);
      
      expect(databaseUtils.saveInventoryItems).toHaveBeenCalledWith(invoiceData.items);
      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('INV-001');
      expect(result.itemsAdded).toBe(1);
    });

    test('converts invoice data to inventory format if needed', async () => {
      const invoiceData = {
        invoiceId: 'INV-001',
        // No items field
      };
      
      const result = await invoiceService.saveInvoiceToInventory(invoiceData);
      
      expect(invoiceProcessor.convertToInventoryFormat).toHaveBeenCalledWith(invoiceData);
      expect(databaseUtils.saveInventoryItems).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('handles errors', async () => {
      databaseUtils.saveInventoryItems.mockRejectedValueOnce(new Error('Database error'));
      
      const invoiceData = {
        invoiceId: 'INV-001',
        items: [{ product: 'Product A', quantity: 5 }]
      };
      
      await expect(invoiceService.saveInvoiceToInventory(invoiceData)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('processSingleInvoice function', () => {
    test('processes a single invoice with translation', async () => {
      const result = await invoiceService.processSingleInvoice('/path/to/invoice.pdf', 'Bar');
      
      expect(invoiceProcessor.processInvoice).toHaveBeenCalledWith('/path/to/invoice.pdf', 'Bar');
      expect(translationService.translateItems).toHaveBeenCalled();
      expect(databaseUtils.saveInvoice).toHaveBeenCalled();
      expect(result.invoiceId).toBe('INV-001');
    });

    test('uses default location if not provided', async () => {
      await invoiceService.processSingleInvoice('/path/to/invoice.pdf');
      
      expect(invoiceProcessor.processInvoice).toHaveBeenCalledWith('/path/to/invoice.pdf', 'Bar');
    });

    test('handles errors during processing', async () => {
      invoiceProcessor.processInvoice.mockRejectedValueOnce(new Error('Processing error'));
      
      await expect(invoiceService.processSingleInvoice('/path/to/invoice.pdf')).rejects.toThrow('Processing error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('startScheduler function', () => {
    test('starts scheduler if not already running', () => {
      const result = invoiceService.startScheduler();
      
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalled();
    });

    test('does not start scheduler if already running', () => {
      // Start once
      invoiceService.startScheduler();
      
      // Try to start again
      const result = invoiceService.startScheduler();
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('stopScheduler function', () => {
    test('stops scheduler if running', () => {
      // Start scheduler first
      invoiceService.startScheduler();
      
      // Then stop it
      const result = invoiceService.stopScheduler();
      
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalled();
    });

    test('does not stop scheduler if not running', () => {
      const result = invoiceService.stopScheduler();
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('getInvoiceHistory function', () => {
    test('returns invoice history with default limit', async () => {
      const result = await invoiceService.getInvoiceHistory();
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('INV-001');
    });

    test('respects the limit parameter', async () => {
      const result = await invoiceService.getInvoiceHistory(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('INV-001');
    });
  });
});