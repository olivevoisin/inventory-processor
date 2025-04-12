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

    it('should throw ExternalServiceError when getInventory fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'getInventory');
      
      // Mock implementation for this test only - throw an error inside the try/catch
      spy.mockImplementationOnce(() => {
        throw new Error('Simulated getInventory error');
      });
      
      await expect(googleSheets.getInventory()).rejects.toThrow(ExternalServiceError);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error getting inventory'));
      
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

    it('should throw ExternalServiceError when updateInventory fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'updateInventory');
      
      // Mock implementation for this test only - throw an error inside the try/catch
      spy.mockImplementationOnce(() => {
        throw new Error('Simulated update error');
      });
      
      const item = { sku: 'SKU-001', quantity: 15 };
      await expect(googleSheets.updateInventory(item)).rejects.toThrow(ExternalServiceError);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error updating inventory'));
      
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

    it('should throw ExternalServiceError when addInventoryItem fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'addInventoryItem');
      
      // Mock implementation for this test only - throw an error inside the try/catch
      spy.mockImplementationOnce(() => {
        throw new Error('Simulated add error');
      });
      
      const item = { sku: 'SKU-003', quantity: 20 };
      await expect(googleSheets.addInventoryItem(item)).rejects.toThrow(ExternalServiceError);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error adding inventory item'));
      
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

    it('should throw ExternalServiceError when deleteInventoryItem fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'deleteInventoryItem');
      
      // Mock implementation for this test only - throw an error inside the try/catch
      spy.mockImplementationOnce(() => {
        throw new Error('Simulated delete error');
      });
      
      await expect(googleSheets.deleteInventoryItem('SKU-001')).rejects.toThrow(ExternalServiceError);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error deleting inventory item'));
      
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

    it('should throw ExternalServiceError when exportInventory fails', async () => {
      // Create a spy on the original function
      const spy = jest.spyOn(googleSheets, 'exportInventory');
      
      // Mock implementation for this test only - throw an error inside the try/catch
      spy.mockImplementationOnce(() => {
        throw new Error('Simulated export error');
      });
      
      const items = [{ sku: 'SKU-001', quantity: 10 }];
      await expect(googleSheets.exportInventory(items)).rejects.toThrow(ExternalServiceError);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error exporting inventory'));
      
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

    it('should return custom config when GOOGLE_SHEETS_USE_CUSTOM is true', () => {
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

    it('should use custom config when GOOGLE_SHEETS_USE_CUSTOM is true', () => {
      process.env.GOOGLE_SHEETS_USE_CUSTOM = 'true';
      
      const result = googleSheets.createSpreadsheet();
      
      expect(result.docId).toBe('custom-doc-id');
      expect(console.debug).toHaveBeenCalledWith('Using custom config for Google Spreadsheet');
      expect(console.log).toHaveBeenCalledWith(`Initialized Google Spreadsheet with docId: custom-doc-id`);
    });

    it('should throw error when GOOGLE_SHEETS_FORCE_ERROR is true', () => {
      process.env.GOOGLE_SHEETS_FORCE_ERROR = 'true';
      
      expect(() => googleSheets.createSpreadsheet()).toThrow('Forced error during spreadsheet initialization');
    });
  });
});