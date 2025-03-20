// __tests__/unit/utils/database-utils.test.js
const { 
    initialize, 
    getInventoryItems, 
    updateInventory, 
    createBackup
  } = require('../../../utils/database-utils');
  const { GoogleSpreadsheet } = require('google-spreadsheet');
  const databaseUtils = require('../../__mocks__/database-utils-mock');
  const { mockLogger, mockWinston } = require('../../__mocks__/logger-mock');

  // Mock the winston module
jest.mock('winston', () => mockWinston);

// Now mock your actual logger
jest.mock('../../../utils/logger', () => mockLogger);
;

  // Mock the Google Sheets API
  jest.mock('google-spreadsheet');
  jest.mock('../../../utils/logger', () => require('../../__mocks__/logger-mock'));
  
  describe('Database Utils Module', () => {
    let mockDoc;
    let mockSheet;
    let mockRows;
    
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Set up Google Sheets mock
      mockRows = [
        { sku: 'SKU12345', quantity: 10, location: 'A3', lastUpdated: '2023-10-15' },
        { sku: 'SKU67890', quantity: 5, location: 'B7', lastUpdated: '2023-10-14' }
      ];
      
      mockSheet = {
        getRows: jest.fn().mockResolvedValue(mockRows),
        addRow: jest.fn().mockImplementation(row => Promise.resolve({ ...row, _sheet: mockSheet })),
        title: 'Inventory',
        headerValues: ['sku', 'quantity', 'location', 'lastUpdated']
      };
      
      mockDoc = {
        loadInfo: jest.fn().mockResolvedValue(undefined),
        sheetsByTitle: { 'Inventory': mockSheet },
        sheetsByIndex: [mockSheet],
        addSheet: jest.fn().mockResolvedValue(mockSheet)
      };
      
      GoogleSpreadsheet.mockImplementation(() => mockDoc);
    });
  
    describe('initialize', () => {
      it('should authenticate and load spreadsheet', async () => {
        // Act
        await initialize('test_sheet_id');
        
        // Assert
        expect(GoogleSpreadsheet).toHaveBeenCalledWith('test_sheet_id');
        expect(mockDoc.loadInfo).toHaveBeenCalled();
      });
  
      it('should create inventory sheet if it does not exist', async () => {
        // Arrange
        mockDoc.sheetsByTitle = {};
        
        // Act
        await initialize('test_sheet_id');
        
        // Assert
        expect(mockDoc.addSheet).toHaveBeenCalledWith({
          title: 'Inventory',
          headerValues: expect.arrayContaining(['sku', 'quantity', 'location', 'lastUpdated'])
        });
      });
    });
  
    describe('getInventoryItems', () => {
      it('should retrieve all inventory items', async () => {
        // Arrange
        await initialize('test_sheet_id');
        
        // Act
        const items = await getInventoryItems();
        
        // Assert
        expect(items).toEqual(mockRows);
        expect(mockSheet.getRows).toHaveBeenCalled();
      });
  
      it('should filter by SKU when specified', async () => {
        // Arrange
        await initialize('test_sheet_id');
        mockSheet.getRows.mockImplementation(() => 
          Promise.resolve(mockRows.filter(row => row.sku === 'SKU12345'))
        );
        
        // Act
        const items = await getInventoryItems('SKU12345');
        
        // Assert
        expect(items).toHaveLength(1);
        expect(items[0].sku).toBe('SKU12345');
      });
    });
  
    describe('updateInventory', () => {
      it('should add new inventory item if SKU does not exist', async () => {
        // Arrange
        await initialize('test_sheet_id');
        const updateData = { 
          sku: 'NEWSKU', 
          quantity: 15, 
          location: 'C9' 
        };
        
        // Act
        await updateInventory(updateData);
        
        // Assert
        expect(mockSheet.addRow).toHaveBeenCalledWith(expect.objectContaining({
          sku: 'NEWSKU',
          quantity: 15,
          location: 'C9',
          lastUpdated: expect.any(String)
        }));
      });
  
      it('should update existing inventory item if SKU exists', async () => {
        // Arrange
        await initialize('test_sheet_id');
        const existingRow = mockRows[0];
        existingRow.save = jest.fn().mockResolvedValue(undefined);
        
        mockSheet.getRows.mockImplementation((query) => 
          Promise.resolve(mockRows.filter(row => row.sku === query.sku))
        );
        
        const updateData = { 
          sku: 'SKU12345', 
          quantity: 15,  // Updated quantity
          location: 'A3' 
        };
        
        // Act
        await updateInventory(updateData);
        
        // Assert
        expect(existingRow.quantity).toBe(15);
        expect(existingRow.save).toHaveBeenCalled();
        expect(mockSheet.addRow).not.toHaveBeenCalled();
      });
    });
  
    describe('createBackup', () => {
      it('should create a backup sheet with current date', async () => {
        // Arrange
        await initialize('test_sheet_id');
        const dateNow = new Date('2023-10-15T12:00:00Z');
        jest.spyOn(global, 'Date').mockImplementation(() => dateNow);
        
        // Act
        await createBackup();
        
        // Assert
        expect(mockDoc.addSheet).toHaveBeenCalledWith({
          title: expect.stringContaining('Backup_2023-10-15'),
          headerValues: expect.arrayContaining(['sku', 'quantity', 'location', 'lastUpdated'])
        });
      });
    });
  });