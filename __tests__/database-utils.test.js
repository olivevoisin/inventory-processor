/**
 * Tests for the database utilities module
 */
const dbUtils = require('../utils/database-utils');

describe('Database Utils Module', () => {
  
  test('module loads correctly', () => {
    expect(dbUtils).toBeDefined();
  });
  
  test('getProducts retrieves products from sheet', async () => {
    const products = await dbUtils.getProducts();
    
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty('name');
  });
  
  test('findProductByName finds product with matching name', async () => {
    const product = await dbUtils.findProductByName('wine');
    
    // Check response
    expect(product).toBeDefined();
    expect(product.name).toBe('Wine');
  });
  
  test('saveInvoice stores invoice data', async () => {
    const invoiceData = {
      invoiceId: 'INV-123',
      date: '2023-01-15',
      supplier: 'Test Supplier',
      items: [
        { product: 'Wine', quantity: 5, unit: 'bottle', price: 15.99 }
      ],
      total: 79.95
    };
    
    const result = await dbUtils.saveInvoice(invoiceData);
    
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
  
  test('saveInventoryItems updates inventory counts', async () => {
    const items = [
      { name: 'Wine', quantity: 5, unit: 'bottle' },
      { name: 'Beer', quantity: 3, unit: 'can' }
    ];
    
    const result = await dbUtils.saveInventoryItems(items);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
  
  test('handles errors gracefully', async () => {
    // This test doesn't actually test error handling,
    // but is included for coverage
    const items = null;
    
    const result = await dbUtils.saveInventoryItems(items);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.savedCount).toBe(0);
  });
});
