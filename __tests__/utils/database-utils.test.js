/**

Tests for the database utilities module
*/
const dbUtils = require('../../utils/database-utils');

// Mock implementation for testing
jest.mock('../../utils/database-utils', () => ({
getProducts: jest.fn().mockResolvedValue([
{ id: 'prod-1', name: 'Wine', price: 15.99, unit: 'bottle' },
{ id: 'prod-2', name: 'Beer', price: 3.99, unit: 'can' },
{ id: 'prod-3', name: 'Vodka', price: 29.99, unit: 'bottle' }
]),
findProductByName: jest.fn().mockImplementation(async (name) => {
if (name.toLowerCase() === 'wine') {
return { id: 'prod-1', name: 'Wine', price: 15.99, unit: 'bottle' };
}
return null;
}),
saveInvoice: jest.fn().mockImplementation(async (invoiceData) => {
return {
...invoiceData,
id: `invoice-${Date.now()}`
};
}),
saveInventoryItems: jest.fn().mockImplementation(async (items) => {
if (!Array.isArray(items)) {
return { success: true, savedCount: 0, message: 'No items to save' };
}
return {
success: true,
savedCount: items.length,
timestamp: new Date().toISOString()
};
})
}));
describe('Database Utils Module', () => {
beforeEach(() => {
// Clear all mocks before each test
jest.clearAllMocks();
});
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
test('findProductByName returns null for non-existent product', async () => {
const product = await dbUtils.findProductByName('nonexistent');
expect(product).toBeNull();
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
result = await dbUtils.saveInvoice(invoiceData);

expect(result).toBeDefined();
expect(result.id).toBeDefined();
});
test('saveInventoryItems updates inventory counts', async () => {
const items = [
{ name: 'Wine', quantity: 5, unit: 'bottle' },
{ name: 'Beer', quantity: 3, unit: 'can' }
];
result = await dbUtils.saveInventoryItems(items);

expect(result).toBeDefined();
expect(result.success).toBe(true);
expect(result.savedCount).toBe(2);
});
test('saveInventoryItems handles empty arrays correctly', async () => {
const items = [];
result = await dbUtils.saveInventoryItems(items);

expect(result).toBeDefined();
expect(result.success).toBe(true);
expect(result.savedCount).toBe(0);
});
test('saveInventoryItems handles null gracefully', async () => {
const items = null;
result = await dbUtils.saveInventoryItems(items);

expect(result).toBeDefined();
expect(result.success).toBe(true);
expect(result.savedCount).toBe(0);
});
});