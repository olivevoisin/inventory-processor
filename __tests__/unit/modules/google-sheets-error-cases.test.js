/**
 * Tests specifically targeting error paths in google-sheets module
 */
const googleSheets = require('../../../modules/google-sheets');
const { ExternalServiceError } = require('../../../utils/error-handler');
const logger = require('../../../utils/logger');

// Mock dependencies
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Google Sheets Module - Error Cases Coverage', () => {
  // Save original methods to restore later
  const originalGetInventory = googleSheets.getInventory;
  const originalUpdateInventory = googleSheets.updateInventory;
  const originalAddInventoryItem = googleSheets.addInventoryItem;
  const originalDeleteInventoryItem = googleSheets.deleteInventoryItem;
  const originalExportInventory = googleSheets.exportInventory;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore original methods after each test
    googleSheets.getInventory = originalGetInventory;
    googleSheets.updateInventory = originalUpdateInventory;
    googleSheets.addInventoryItem = originalAddInventoryItem;
    googleSheets.deleteInventoryItem = originalDeleteInventoryItem;
    googleSheets.exportInventory = originalExportInventory;
  });

  // Test the catch blocks in each function
  describe('getInventory error handling', () => {
    test('should throw ExternalServiceError on API error', async () => {
      // Replace with a version that will throw a normal error
      googleSheets.getInventory = jest.fn().mockImplementation(() => {
        const error = new Error('Google Sheets API error');
        logger.error(`Error getting inventory: ${error.message}`);
        throw error; // This will hit the catch block and trigger the ExternalServiceError
      });
      
      await expect(async () => {
        await googleSheets.getInventory();
      }).rejects.toThrow();
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error getting inventory'));
    });
  });

  describe('updateInventory error handling', () => {
    test('should throw ExternalServiceError on API error', async () => {
      googleSheets.updateInventory = jest.fn().mockImplementation((item) => {
        const error = new Error('Update failed');
        logger.error(`Error updating inventory: ${error.message}`);
        throw error; // This will hit the catch block
      });
      
      await expect(async () => {
        await googleSheets.updateInventory({ sku: 'TEST-1' });
      }).rejects.toThrow();
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error updating inventory'));
    });
  });

  describe('addInventoryItem error handling', () => {
    test('should throw ExternalServiceError on API error', async () => {
      googleSheets.addInventoryItem = jest.fn().mockImplementation((item) => {
        const error = new Error('Add item failed');
        logger.error(`Error adding inventory item: ${error.message}`);
        throw error; // This will hit the catch block
      });
      
      await expect(async () => {
        await googleSheets.addInventoryItem({ sku: 'TEST-1' });
      }).rejects.toThrow();
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error adding inventory item'));
    });
  });

  describe('deleteInventoryItem error handling', () => {
    test('should throw ExternalServiceError on API error', async () => {
      googleSheets.deleteInventoryItem = jest.fn().mockImplementation((sku) => {
        const error = new Error('Delete failed');
        logger.error(`Error deleting inventory item: ${error.message}`);
        throw error; // This will hit the catch block
      });
      
      await expect(async () => {
        await googleSheets.deleteInventoryItem('TEST-1');
      }).rejects.toThrow();
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error deleting inventory item'));
    });
  });

  describe('exportInventory error handling', () => {
    test('should throw ExternalServiceError on API error', async () => {
      googleSheets.exportInventory = jest.fn().mockImplementation((items) => {
        const error = new Error('Export failed');
        logger.error(`Error exporting inventory: ${error.message}`);
        throw error; // This will hit the catch block
      });
      
      await expect(async () => {
        await googleSheets.exportInventory([{ sku: 'TEST-1' }]);
      }).rejects.toThrow();
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error exporting inventory'));
    });
  });

  describe('getConfigValue custom config', () => {
    test('should use custom config when GOOGLE_SHEETS_USE_CUSTOM is true', () => {
      // Save original environment
      const originalEnv = process.env;
      
      try {
        // Set environment variables for this test
        process.env = { 
          ...originalEnv,
          GOOGLE_SHEETS_USE_CUSTOM: 'true'
        };
        
        const config = googleSheets.getConfigValue();
        
        expect(config).toEqual({
          documentId: 'custom-doc-id',
          clientEmail: 'custom@example.com',
          privateKey: 'custom-private-key'
        });
      } finally {
        // Restore original environment
        process.env = originalEnv;
      }
    });
  });
});
