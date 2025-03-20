const sinon = require('sinon');
const { setupGoogleSheetsMock } = require('../../mocks/google-sheets-mock');
const logger = require('../../../utils/logger');
const { ExternalServiceError } = require('../../../utils/error-handler');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

// Mock error-handler
jest.mock('../../../utils/error-handler', () => ({
  ExternalServiceError: class ExternalServiceError extends Error {
    constructor(message, service, code) {
      super(message);
      this.service = service;
      this.code = code;
    }
  }
}), { virtual: true });

describe('GoogleSheets Module', () => {
  let googleSheets;
  let mockDoc;

  beforeEach(() => {
    // Reset modules to ensure clean state
    jest.resetModules();
    
    // Setup Google Sheets mock
    mockDoc = setupGoogleSheetsMock({
      sheetId: 'test_sheet_id',
      inventoryItems: [
        { sku: 'SKU-001', quantity: 10, location: 'A1', lastUpdated: '2023-10-01', price: 100 },
        { sku: 'SKU-002', quantity: 5, location: 'B2', lastUpdated: '2023-10-02', price: 200 }
      ]
    });
    
    // Import the module after mocks are set up
    googleSheets = require('../../../modules/google-sheets');
  });

  afterEach(() => {
    sinon.restore();
  });

  test('module loads correctly', () => {
    expect(googleSheets).toBeDefined();
  });

  describe('getInventory', () => {
    test('fetches inventory data successfully', async () => {
      const inventory = await googleSheets.getInventory();
      
      expect(inventory).toEqual([
        { sku: 'SKU-001', quantity: 10, location: 'A1', lastUpdated: '2023-10-01', price: 100 },
        { sku: 'SKU-002', quantity: 5, location: 'B2', lastUpdated: '2023-10-02', price: 200 }
      ]);
      
      expect(mockDoc.loadInfo).toHaveBeenCalled();
      expect(mockDoc.sheetsByTitle['Inventory'].getRows).toHaveBeenCalled();
    });

    test('throws ExternalServiceError on failure', async () => {
      mockDoc.sheetsByTitle['Inventory'].getRows.rejects(new Error('API error'));
      
      await expect(googleSheets.getInventory()).rejects.toThrow(
        new ExternalServiceError(
          'Failed to fetch inventory: API error',
          'google-sheets',
          'INVENTORY_FETCH_ERROR'
        )
      );
      
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch inventory', {
        module: 'google-sheets',
        error: 'API error'
      });
    });
  });

  describe('updateInventory', () => {
    test('updates inventory successfully', async () => {
      const updatedItem = { sku: 'SKU-001', quantity: 15, location: 'A1', lastUpdated: '2023-10-03', price: 100 };
      
      await googleSheets.updateInventory(updatedItem);
      
      const inventorySheet = mockDoc.sheetsByTitle['Inventory'];
      expect(inventorySheet.getRows).toHaveBeenCalled();
      
      const updatedRow = inventorySheet._rows.find(row => row.sku === 'SKU-001');
      expect(updatedRow.quantity).toBe(15);
      expect(updatedRow.lastUpdated).toBe('2023-10-03');
      expect(updatedRow.save).toHaveBeenCalled();
    });

    test('throws ExternalServiceError on failure', async () => {
      mockDoc.sheetsByTitle['Inventory'].getRows.rejects(new Error('API error'));
      
      const updatedItem = { sku: 'SKU-001', quantity: 15, location: 'A1', lastUpdated: '2023-10-03', price: 100 };
      
      await expect(googleSheets.updateInventory(updatedItem)).rejects.toThrow(
        new ExternalServiceError(
          'Failed to update inventory: API error',
          'google-sheets',
          'INVENTORY_UPDATE_ERROR'
        )
      );
      
      expect(logger.error).toHaveBeenCalledWith('Failed to update inventory', {
        module: 'google-sheets',
        error: 'API error'
      });
    });
  });

  describe('addInventoryItem', () => {
    test('adds a new inventory item successfully', async () => {
      const newItem = { sku: 'SKU-003', quantity: 20, location: 'C3', lastUpdated: '2023-10-03', price: 300 };
      
      await googleSheets.addInventoryItem(newItem);
      
      const inventorySheet = mockDoc.sheetsByTitle['Inventory'];
      expect(inventorySheet.addRow).toHaveBeenCalledWith(newItem);
    });

    test('throws ExternalServiceError on failure', async () => {
      mockDoc.sheetsByTitle['Inventory'].addRow.rejects(new Error('API error'));
      
      const newItem = { sku: 'SKU-003', quantity: 20, location: 'C3', lastUpdated: '2023-10-03', price: 300 };
      
      await expect(googleSheets.addInventoryItem(newItem)).rejects.toThrow(
        new ExternalServiceError(
          'Failed to add inventory item: API error',
          'google-sheets',
          'INVENTORY_ADD_ERROR'
        )
      );
      
      expect(logger.error).toHaveBeenCalledWith('Failed to add inventory item', {
        module: 'google-sheets',
        error: 'API error'
      });
    });
  });

  describe('deleteInventoryItem', () => {
    test('deletes an inventory item successfully', async () => {
      await googleSheets.deleteInventoryItem('SKU-001');
      
      const inventorySheet = mockDoc.sheetsByTitle['Inventory'];
      const deletedRow = inventorySheet._rows.find(row => row.sku === 'SKU-001');
      expect(deletedRow.delete).toHaveBeenCalled();
    });

    test('throws ExternalServiceError on failure', async () => {
      mockDoc.sheetsByTitle['Inventory'].getRows.rejects(new Error('API error'));
      
      await expect(googleSheets.deleteInventoryItem('SKU-001')).rejects.toThrow(
        new ExternalServiceError(
          'Failed to delete inventory item: API error',
          'google-sheets',
          'INVENTORY_DELETE_ERROR'
        )
      );
      
      expect(logger.error).toHaveBeenCalledWith('Failed to delete inventory item', {
        module: 'google-sheets',
        error: 'API error'
      });
    });
  });
});
