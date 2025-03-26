/**
 * Invoice Workflow Mock pour les tests
 */

// Mock functions for testing
const processSingleInvoice = jest.fn().mockImplementation((filePath, location) => {
  if (filePath.includes('failing-ocr')) {
    throw new Error('OCR failed');
  }
  
  if (filePath.includes('failing-translation')) {
    throw new Error('Translation failed');
  }
  
  return {
    invoiceId: `INV-${Date.now()}`,
    date: '2023-01-15',
    supplier: 'Test Supplier',
    items: [
      { product: 'Vodka Grey Goose', count: 5, price: '29.99' },
      { product: 'Wine Cabernet', count: 10, price: '15.99' }
    ],
    total: '1250.00',
    location
  };
});

const processInvoiceDirectory = jest.fn().mockImplementation((sourceDir, processedDir) => {
  if (sourceDir.includes('empty')) {
    return { success: true, processed: 0, message: 'No files found' };
  }
  
  return {
    success: true,
    processed: 3,
    errors: 0,
    items: [
      { product: 'Vodka Grey Goose', count: 5, price: '29.99' },
      { product: 'Wine Cabernet', count: 10, price: '15.99' },
      { product: 'Whiskey', count: 3, price: '45.99' }
    ]
  };
});

module.exports = {
  processSingleInvoice,
  processInvoiceDirectory
};
