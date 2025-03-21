/**
 * Google Sheets Mock
 * Provides mock implementations for Google Sheets API
 */

function setupGoogleSheetsMock() {
  // Create mock row object
  const createMockRow = (data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({})
  });
  
  // Create mock rows
  const mockRows = [
    createMockRow({ sku: 'SKU-001', quantity: 10, location: 'A1', lastUpdated: '2023-10-01', price: 100 }),
    createMockRow({ sku: 'SKU-002', quantity: 5, location: 'B2', lastUpdated: '2023-10-02', price: 200 })
  ];
  
  // Create mock sheet
  const mockInventorySheet = {
    getRows: jest.fn().mockResolvedValue(mockRows),
    addRow: jest.fn().mockImplementation((rowData) => {
      const newRow = createMockRow(rowData);
      mockRows.push(newRow);
      return Promise.resolve(newRow);
    }),
    _rows: mockRows
  };
  
  // Create mock doc
  const mockDoc = {
    title: 'Test Inventory Spreadsheet',
    _id: 'mock-spreadsheet-id',
    sheetsByTitle: {
      'Inventory': mockInventorySheet
    },
    loadInfo: jest.fn().mockResolvedValue({}),
    addSheet: jest.fn().mockImplementation(({ title }) => {
      mockDoc.sheetsByTitle[title] = {
        getRows: jest.fn().mockResolvedValue([]),
        addRow: jest.fn().mockResolvedValue({}),
        _rows: []
      };
      return Promise.resolve(mockDoc.sheetsByTitle[title]);
    })
  };
  
  // Mock auth client
  const mockAuthClient = {
    authorize: jest.fn().mockResolvedValue({}),
    setCredentials: jest.fn()
  };
  
  // Mock auth
  const mockAuth = {
    getClient: jest.fn().mockResolvedValue(mockAuthClient)
  };
  
  return {
    mockDoc,
    mockAuth,
    mockRows
  };
}

module.exports = {
  setupGoogleSheetsMock
};
