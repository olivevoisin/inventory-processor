/**
 * Tests for database-utils module (root level)
 */

// Create mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

const mockGoogleSheetsService = {
  getProducts: jest.fn(),
  initialize: jest.fn().mockResolvedValue(true),
  saveInventoryItems: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true)
};

// Import module under test (after setting up mocks)
const databaseUtils = require('../utils/database-utils');

// Set up dependencies injection
databaseUtils.__setDependencies({
  logger: mockLogger,
  googleSheetsService: mockGoogleSheetsService
});

describe('Database Utils Module', () => {
  // Setup mock data for tests
  const mockProducts = [
    { id: 'prod-1', name: 'Wine', unit: 'bottle', price: 15.99 },
    { id: 'prod-2', name: 'Beer', unit: 'can', price: 3.99 },
    { id: 'prod-3', name: 'Vodka', unit: 'bottle', price: 29.99 },
    { id: 'prod-4', name: 'Whisky', unit: 'bottle', price: 39.99 }
  ];

  const mockInventory = [
    { id: 'inv-1', productId: 'prod-1', location: 'Bar', quantity: 10 },
    { id: 'inv-2', productId: 'prod-2', location: 'Bar', quantity: 24 },
    { id: 'inv-3', productId: 'prod-3', location: 'Storage', quantity: 5 }
  ];

  const mockInvoices = [
    { id: 'INV-123', invoiceId: 'INV-123', date: '2023-01-15', supplier: 'Supplier A' },
    { id: 'INV-456', invoiceId: 'INV-456', date: '2023-02-20', supplier: 'Supplier B' }
  ];

  beforeEach(() => {
    // Clear all mock calls
    jest.clearAllMocks();
    
    // Initialize mock database with test data
    databaseUtils.__setMockDb({
      products: [...mockProducts],
      inventory: [...mockInventory],
      invoices: [...mockInvoices]
    });
  });

  test('initialize successfully connects to database', async () => {
    // Execute
    const result = await databaseUtils.initialize();
    
    // Check response
    expect(result).toBe(true);
    expect(mockLogger.info).toHaveBeenCalledWith('Initializing database connection');
  });
  
  test('findProductByName finds product with matching name', async () => {
    // Execute
    const product = await databaseUtils.findProductByName('Wine');
    
    // Check response
    expect(product).toBeDefined();
    expect(product.name).toBe('Wine');
  });
  
  test('saveInvoice stores invoice data', async () => {
    // Setup
    const invoice = {
      invoiceId: 'INV-TEST',
      date: '2023-10-15',
      supplier: 'Test Supplier',
      items: [{ product: 'Wine', quantity: 10 }]
    };
    
    // Execute
    const result = await databaseUtils.saveInvoice(invoice);
    
    // Check response
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.id).toBe('INV-TEST');
  });
  
  test('getProducts returns all products', async () => {
    // Mock Google Sheets to return empty so we use our mock data
    mockGoogleSheetsService.getProducts.mockResolvedValueOnce([]);
    
    // Execute
    const products = await databaseUtils.getProducts();
    
    // Check response
    expect(products).toHaveLength(4);
    expect(products[0].name).toBe('Wine');
  });
  
  test('saveInventoryItems updates inventory counts', async () => {
    // Setup
    const items = [
      { productId: 'prod-1', quantity: 5, location: 'Bar' }
    ];
    
    // Execute
    const result = await databaseUtils.saveInventoryItems({
      items,
      location: 'Bar'
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
  
  test('handles errors gracefully', async () => {
    // Setup - empty item array with location
    const items = [];
    
    // Execute
    const result = await databaseUtils.saveInventoryItems({
      items,
      location: 'Bar'
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.savedCount).toBe(0);
  });
});
