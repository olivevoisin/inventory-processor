// Setup file for Jest tests

// Mock for the Deepgram SDK
jest.mock('@deepgram/sdk', () => {
  const mockDeepgram = require('./mocks/deepgram-mock');
  return {
    Deepgram: jest.fn().mockImplementation(() => mockDeepgram)
  };
});

// Mock for the Google Sheets API
jest.mock('google-spreadsheet', () => ({
  GoogleSpreadsheet: jest.fn().mockImplementation(() => ({
    useServiceAccountAuth: jest.fn().mockResolvedValue(null),
    loadInfo: jest.fn().mockResolvedValue(null),
    sheetsByTitle: {
      'Inventory': {
        getRows: jest.fn().mockResolvedValue([
          {
            sku: 'SKU-001',
            quantity: '10',
            location: 'Bar',
            lastUpdated: '2023-01-01',
            price: '29.99',
            save: jest.fn().mockResolvedValue(null),
            delete: jest.fn().mockResolvedValue(null)
          }
        ]),
        addRow: jest.fn().mockResolvedValue(null)
      }
    },
    addSheet: jest.fn().mockResolvedValue({
      title: 'Inventory',
      getRows: jest.fn().mockResolvedValue([]),
      addRow: jest.fn().mockResolvedValue(null)
    })
  }))
}));

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.API_KEY = 'test-api-key';
