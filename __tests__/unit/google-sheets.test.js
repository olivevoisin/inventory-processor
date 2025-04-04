// __tests__/unit/google-sheets.test.js
const googleSheets = require('../../modules/google-sheets');

describe('Google Sheets Integration', () => {
  describe('Inventory Operations', () => {
    test('should get inventory data', async () => {
      const inventory = await googleSheets.getInventory();
      
      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory[0]).toHaveProperty('sku');
      expect(inventory[0]).toHaveProperty('quantity');
      expect(inventory[0]).toHaveProperty('location');
    });
    
    test('should add inventory item', async () => {
      const item = {
        sku: `SKU-${Date.now()}`,
        quantity: 10,
        location: 'Bar',
        lastUpdated: new Date().toISOString().split('T')[0],
        price: 19.99
      };
      
      const result = await googleSheets.addInventoryItem(item);
      expect(result).toBe(true);
    });
    
    test('should update inventory item', async () => {
      const item = {
        sku: 'SKU-001',
        quantity: 15,
        location: 'Bar',
        lastUpdated: new Date().toISOString().split('T')[0],
        price: 29.99
      };
      
      const result = await googleSheets.updateInventory(item);
      expect(result).toBe(true);
    });
    
    test('should delete inventory item', async () => {
      const result = await googleSheets.deleteInventoryItem('SKU-TO-DELETE');
      expect(result).toBe(true);
    });
  });
  
  describe('Export Operations', () => {
    test('should export inventory to Google Sheets', async () => {
      const items = [
        { sku: 'TEST-SKU-1', quantity: 5, location: 'Bar', price: 10.99 },
        { sku: 'TEST-SKU-2', quantity: 10, location: 'Kitchen', price: 5.99 }
      ];
      
      const result = await googleSheets.exportInventory(items);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('itemCount', 2);
    });
  });
});
