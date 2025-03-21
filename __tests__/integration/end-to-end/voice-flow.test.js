// __tests__/integration/end-to-end/voice-flow.test.js
const fs = require('fs');
const path = require('path');
const invoiceProcessor = require('../../../modules/invoice-processor');
const translationService = require('../../../modules/translation-service');
const database = require('../../../utils/database-utils');

// Mock dependencies
jest.mock('fs', () => {
  const originalModule = jest.requireActual('fs');
  return {
    ...originalModule,
    promises: {
      ...originalModule.promises,
      readdir: jest.fn().mockResolvedValue(['invoice1.pdf', 'invoice2.pdf']),
      readFile: jest.fn().mockResolvedValue(Buffer.from('test data')),
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      rename: jest.fn().mockResolvedValue(undefined)
    }
  };
});

jest.mock('../../../modules/invoice-processor', () => ({
  processInvoice: jest.fn().mockResolvedValue({
    items: [
      { product: 'Vodka Grey Goose', count: 5, price: '14,995' },
      { product: 'Wine Cabernet', count: 10, price: '15,990' }
    ],
    invoiceDate: '2023-01-15',
    total: '30,985',
    location: 'Bar'
  })
}));

jest.mock('../../../modules/translation-service', () => ({
  translateItems: jest.fn().mockImplementation(items => {
    const translations = {
      'ウォッカ グレイグース': 'Vodka Grey Goose',
      'ワイン カベルネ': 'Wine Cabernet'
    };
    
    return Promise.resolve(
      items.map(item => ({
        ...item,
        product: translations[item.product] || item.product
      }))
    );
  })
}));

jest.mock('../../../utils/database-utils', () => ({
  saveInvoice: jest.fn().mockResolvedValue(true),
  saveInventoryItems: jest.fn().mockResolvedValue(true)
}));

// Import the module to test
const invoiceService = require('../../../modules/invoice-service');

describe('Invoice Processing End-to-End Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should process invoices from start to finish', async () => {
    // Setup
    const sourceDir = '/invoices/incoming';
    const processedDir = '/invoices/processed';
    
    // Execute
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Verify processing steps
    expect(fs.promises.readdir).toHaveBeenCalled();
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
    expect(database.saveInvoice).toHaveBeenCalled();
    
    // Verify result
    expect(result.processed).toBe(2);
    expect(result.success).toBe(true);
  });
  
  test('should handle empty directory gracefully', async () => {
    // Setup - mock empty directory
    fs.promises.readdir.mockResolvedValueOnce([]);
    
    // Execute
    const result = await invoiceService.processInvoices('/empty/dir', '/processed/dir');
    
    // Verify
    expect(result.processed).toBe(0);
    expect(result.success).toBe(true);
  });
  
  test('should add translated items to inventory', async () => {
    // Execute
    const result = await invoiceService.processInvoices('/invoices/incoming', '/invoices/processed');
    
    // Verify
    expect(database.saveInvoice).toHaveBeenCalled();
    expect(database.saveInventoryItems).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
