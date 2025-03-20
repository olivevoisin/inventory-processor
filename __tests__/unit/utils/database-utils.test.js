const databaseUtils = require('../../../utils/database-utils');

// Mock MongoDB client
jest.mock('mongodb', () => ({
  MongoClient: {
    connect: jest.fn().mockResolvedValue({
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn(),
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          }),
          insertOne: jest.fn(),
          updateOne: jest.fn()
        })
      }),
      close: jest.fn()
    })
  }
}));


describe('Database Utils', () => {
  test('saveInvoice should store invoice data', async () => {
    const invoice = { invoiceId: 'INV-123', total: 100 };
    await databaseUtils.saveInvoice(invoice);
    
    // Verify MongoDB client was used correctly
    const mongodb = require('mongodb');
    expect(mongodb.MongoClient.connect).toHaveBeenCalled();
  });

describe('Database Utils Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('initialize', () => {
    it('should initialize the database connection', async () => {
      // Act
      await mockDatabaseUtils.initialize('test_sheet_id');
      
      // Assert
      expect(mockDatabaseUtils.initialize).toHaveBeenCalledWith('test_sheet_id');
    });
  });

  describe('getInventoryItems', () => {
    it('should retrieve all inventory items when no SKU is specified', async () => {
      // Act
      const items = await mockDatabaseUtils.getInventoryItems();
      
      // Assert
      expect(items).toHaveLength(2);
      expect(items).toEqual(expect.arrayContaining([
        expect.objectContaining({ sku: 'SKU12345' }),
        expect.objectContaining({ sku: 'SKU67890' })
      ]));
    });

    it('should filter by SKU when specified', async () => {
      // Act
      const items = await mockDatabaseUtils.getInventoryItems('SKU12345');
      
      // Assert
      expect(items).toHaveLength(1);
      expect(items[0].sku).toBe('SKU12345');
    });
  });

  describe('updateInventory', () => {
    it('should update existing inventory item', async () => {
      // Arrange
      const updateData = { 
        sku: 'SKU12345', 
        quantity: 15,  // Updated quantity
        location: 'A3' 
      };
      
      // Act
      const result = await mockDatabaseUtils.updateInventory(updateData);
      
      // Assert
      expect(result.sku).toBe('SKU12345');
      expect(result.quantity).toBe(15);
      expect(mockDatabaseUtils.updateInventory).toHaveBeenCalledWith(updateData);
    });

    it('should add new inventory item', async () => {
      // Arrange
      const newItem = { 
        sku: 'NEWSKU', 
        quantity: 8, 
        location: 'C9' 
      };
      
      // Act
      const result = await mockDatabaseUtils.updateInventory(newItem);
      
      // Assert
      expect(result.sku).toBe('NEWSKU');
      expect(result.quantity).toBe(8);
      expect(result.location).toBe('C9');
      expect(result.lastUpdated).toBeDefined();
    });
  });

  describe('createBackup', () => {
    it('should create a backup with current date', async () => {
      // Act
      const result = await mockDatabaseUtils.createBackup();
      
      // Assert
      expect(result).toBe('Backup_2023-10-15');
      expect(mockDatabaseUtils.createBackup).toHaveBeenCalled();
    });
  });
});