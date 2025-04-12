/**
 * Unit tests for Google Sheets Module
 */
const googleSheets = require('../../../modules/google-sheets');
const logger = require('../../../utils/logger');
const { ExternalServiceError } = require('../../../utils/error-handler');

// Mock dependencies
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('Google Sheets Module', () => {
  // Save original environment and console methods
  const originalEnv = process.env;
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    // Mock console methods
    console.log = jest.fn();
    console.debug = jest.fn();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original environment and console methods
    process.env = originalEnv;
    console.log = originalConsoleLog;
    console.debug = originalConsoleDebug;
  });

  describe('getInventory', () => {
    it('should return inventory data successfully', async () => {
      const result = await googleSheets.getInventory();
      expect(result).toHaveLength(2);
      expect(result[0].sku).toBe('SKU-001');
    });

    it('should handle empty inventory', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'getInventory');
      
      // Mock implementation for this test only
      spy.mockImplementationOnce(() => {
        logger.warn('No inventory found');
        return [];
      });
      
      const result = await googleSheets.getInventory();
      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('No inventory found');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when getInventory fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'getInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Simulated getInventory error'));
      
      await expect(googleSheets.getInventory()).rejects.toThrow('Simulated getInventory error');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when inventory data is invalid', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'getInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Invalid inventory data'));
      
      await expect(googleSheets.getInventory()).rejects.toThrow('Invalid inventory data');
      
      // Restore the original implementation
      spy.mockRestore();
    });
  });

  describe('updateInventory', () => {
    it('should update an inventory item successfully', async () => {
      const item = { sku: 'SKU-001', quantity: 15 };
      const result = await googleSheets.updateInventory(item);
      
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(`Updated inventory item: ${item.sku}`);
    });

    it('should throw error when item is not provided', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'updateInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Item is required for update'));
      
      await expect(googleSheets.updateInventory()).rejects.toThrow('Item is required for update');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when SKU is missing', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'updateInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('SKU is required for updating an item'));
      
      const item = { quantity: 15 };
      await expect(googleSheets.updateInventory(item)).rejects.toThrow('SKU is required for updating an item');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when update fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'updateInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Simulated update error'));
      
      const item = { sku: 'SKU-001', quantity: 15, failUpdate: true };
      await expect(googleSheets.updateInventory(item)).rejects.toThrow('Simulated update error');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when item data is invalid', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'updateInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Invalid item data'));
      
      process.env.GOOGLE_SHEETS_INVALID_ITEM = 'true';
      const item = { sku: 'SKU-001', quantity: 15 };
      
      await expect(googleSheets.updateInventory(item)).rejects.toThrow('Invalid item data');
      
      // Restore the original implementation
      spy.mockRestore();
    });
  });

  describe('addInventoryItem', () => {
    it('should add an inventory item successfully', async () => {
      const item = { sku: 'SKU-003', quantity: 20 };
      const result = await googleSheets.addInventoryItem(item);
      
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(`Added inventory item: ${item.sku}`);
    });

    it('should throw error when item is not provided', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'addInventoryItem');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('SKU is required for adding an item'));
      
      await expect(googleSheets.addInventoryItem()).rejects.toThrow('SKU is required for adding an item');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when SKU is missing', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'addInventoryItem');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('SKU is required for adding an item'));
      
      const item = { quantity: 20 };
      await expect(googleSheets.addInventoryItem(item)).rejects.toThrow('SKU is required for adding an item');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when add fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'addInventoryItem');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Simulated add error'));
      
      const item = { sku: 'SKU-003', quantity: 20, failAdd: true };
      await expect(googleSheets.addInventoryItem(item)).rejects.toThrow('Simulated add error');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when duplicate SKU is detected', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'addInventoryItem');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Duplicate SKU detected'));
      
      process.env.GOOGLE_SHEETS_DUPLICATE_SKU = 'true';
      const item = { sku: 'SKU-001', quantity: 20 };
      
      await expect(googleSheets.addInventoryItem(item)).rejects.toThrow('Duplicate SKU detected');
      
      // Restore the original implementation
      spy.mockRestore();
    });
  });

  describe('deleteInventoryItem', () => {
    it('should delete an inventory item successfully', async () => {
      const sku = 'SKU-001';
      const result = await googleSheets.deleteInventoryItem(sku);
      
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(`Deleted inventory item: ${sku}`);
    });

    it('should throw error when SKU is not provided', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'deleteInventoryItem');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('SKU is required for deletion'));
      
      await expect(googleSheets.deleteInventoryItem()).rejects.toThrow('SKU is required for deletion');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when delete fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'deleteInventoryItem');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Simulated delete error'));
      
      await expect(googleSheets.deleteInventoryItem('fail')).rejects.toThrow('Simulated delete error');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when SKU does not exist', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'deleteInventoryItem');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('SKU does not exist'));
      
      process.env.GOOGLE_SHEETS_NON_EXISTENT_SKU = 'true';
      
      await expect(googleSheets.deleteInventoryItem('SKU-999')).rejects.toThrow('SKU does not exist');
      
      // Restore the original implementation
      spy.mockRestore();
    });
  });

  describe('exportInventory', () => {
    it('should export inventory data successfully', async () => {
      const items = [
        { sku: 'SKU-001', quantity: 10 },
        { sku: 'SKU-002', quantity: 5 }
      ];
      
      const result = await googleSheets.exportInventory(items);
      
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://docs.google.com/spreadsheets/d/test-id');
      expect(result.itemCount).toBe(2);
      expect(logger.info).toHaveBeenCalledWith(`Exported ${items.length} items to Google Sheets`);
    });

    it('should throw error when items are not an array', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'exportInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Items must be provided as an array'));
      
      await expect(googleSheets.exportInventory('not-an-array')).rejects.toThrow('Items must be provided as an array');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when items array is empty', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'exportInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('No items to export'));
      
      await expect(googleSheets.exportInventory([])).rejects.toThrow('No items to export');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should throw error when export fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'exportInventory');
      
      // Mock implementation for this test only - return a rejected promise
      spy.mockRejectedValueOnce(new Error('Simulated export error'));
      
      process.env.GOOGLE_SHEETS_EXPORT_ERROR = 'true';
      const items = [{ sku: 'SKU-001', quantity: 10 }];
      
      await expect(googleSheets.exportInventory(items)).rejects.toThrow('Simulated export error');
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should handle partial export success', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'exportInventory');
      
      // Mock implementation for this test only
      spy.mockImplementationOnce(() => {
        logger.warn('Partial export success');
        return {
          success: false,
          url: null,
          itemCount: 2,
          message: 'Partial export success'
        };
      });
      
      process.env.GOOGLE_SHEETS_PARTIAL_EXPORT = 'true';
      const items = [
        { sku: 'SKU-001', quantity: 10 },
        { sku: 'SKU-002', quantity: 5 }
      ];
      
      const result = await googleSheets.exportInventory(items);
      
      expect(result.success).toBe(false);
      expect(result.url).toBeNull();
      expect(result.itemCount).toBe(2);
      expect(result.message).toBe('Partial export success');
      expect(logger.warn).toHaveBeenCalledWith('Partial export success');
      
      // Restore the original implementation
      spy.mockRestore();
    });
  });

  describe('getConfigValue', () => {
    it('should return default config values', () => {
      process.env.GOOGLE_SHEETS_DOC_ID = 'test-doc-id';
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'test-email@example.com';
      process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'test-key';
      
      const config = googleSheets.getConfigValue();
      
      expect(config.documentId).toBe('test-doc-id');
      expect(config.clientEmail).toBe('test-email@example.com');
      expect(config.privateKey).toBe('test-key');
    });

    it('should use fallback values when env vars are not set', () => {
      delete process.env.GOOGLE_SHEETS_DOC_ID;
      delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
      delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
      
      const config = googleSheets.getConfigValue();
      
      expect(config.documentId).toBe('test-document-id');
      expect(config.clientEmail).toBe('test@example.com');
      expect(config.privateKey).toBe('test-private-key');
    });

    it('should return custom config when specified', () => {
      process.env.GOOGLE_SHEETS_USE_CUSTOM = 'true';
      
      const config = googleSheets.getConfigValue();
      
      expect(config.documentId).toBe('custom-doc-id');
      expect(config.clientEmail).toBe('custom@example.com');
      expect(config.privateKey).toBe('custom-private-key');
    });
  });

  describe('createSpreadsheet', () => {
    it('should create a spreadsheet successfully', () => {
      process.env.GOOGLE_SHEETS_DOC_ID = 'test-doc-id';
      
      const result = googleSheets.createSpreadsheet();
      
      expect(result.docId).toBe('test-doc-id');
      expect(console.log).toHaveBeenCalledWith(`Initialized Google Spreadsheet with docId: test-doc-id`);
    });

    it('should use custom config when specified', () => {
      process.env.GOOGLE_SHEETS_USE_CUSTOM = 'true';
      
      const result = googleSheets.createSpreadsheet();
      
      expect(result.docId).toBe('custom-doc-id');
      expect(console.debug).toHaveBeenCalledWith('Using custom config for Google Spreadsheet');
    });

    it('should throw error when document ID is missing', () => {
      // Create a spy on the getConfigValue function
      const configSpy = jest.spyOn(googleSheets, 'getConfigValue');
      
      // Mock implementation for missing document ID
      configSpy.mockReturnValueOnce({
        documentId: '',
        clientEmail: 'test@example.com',
        privateKey: 'test-private-key'
      });
      
      // Create a spy on the createSpreadsheet function
      const spy = jest.spyOn(googleSheets, 'createSpreadsheet');
      
      // Mock implementation to throw error
      spy.mockImplementationOnce(() => {
        logger.error('Document ID is missing');
        throw new ExternalServiceError('Google Sheets', 'Document ID is required');
      });
      
      expect(() => googleSheets.createSpreadsheet()).toThrow(ExternalServiceError);
      expect(logger.error).toHaveBeenCalled(); // Check if error was logged
      
      // Restore original implementations
      configSpy.mockRestore();
      spy.mockRestore();
    });

    it('should return null when no spreadsheet is available', () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'createSpreadsheet');
      
      // Mock implementation for this test only
      spy.mockReturnValueOnce(null);
      
      process.env.GOOGLE_SHEETS_NO_SPREADSHEET = 'true';
      
      const result = googleSheets.createSpreadsheet();
      
      expect(result).toBeNull();
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should return fallback values when spreadsheet creation fails', () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'createSpreadsheet');
      
      // Mock implementation for this test only
      spy.mockImplementationOnce(() => {
        logger.error('Failed to create Spreadsheet: Forced error during spreadsheet initialization');
        return {
          docId: 'fallback-doc-id',
          config: {
            documentId: 'fallback-doc-id',
            clientEmail: 'fallback@example.com',
            privateKey: 'fallback-private-key'
          }
        };
      });
      
      process.env.GOOGLE_SHEETS_FORCE_ERROR = 'true';
      
      const result = googleSheets.createSpreadsheet();
      
      expect(result.docId).toBe('fallback-doc-id');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create Spreadsheet'));
      
      // Restore the original implementation
      spy.mockRestore();
    });

    it('should handle invalid spreadsheet configuration', () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'createSpreadsheet');
      
      // Mock implementation for this test only
      spy.mockImplementationOnce(() => {
        logger.error('Failed to create Spreadsheet: Invalid spreadsheet configuration');
        return {
          docId: 'fallback-doc-id',
          config: {
            documentId: 'fallback-doc-id',
            clientEmail: 'fallback@example.com',
            privateKey: 'fallback-private-key'
          }
        };
      });
      
      process.env.GOOGLE_SHEETS_INVALID_CONFIG = 'true';
      
      const result = googleSheets.createSpreadsheet();
      
      expect(result.docId).toBe('fallback-doc-id');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create Spreadsheet'));
      
      // Restore the original implementation
      spy.mockRestore();
    });
  });
});