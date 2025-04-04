/**
 * Google Sheets Mock
 * Provides mock implementations for Google Sheets API
 */

const sheetsMock = {
  mockSheet: {
    addRows: jest.fn().mockResolvedValue([]),
    getRows: jest.fn().mockResolvedValue([]),
    setHeaderRow: jest.fn().mockResolvedValue({}),
    headerValues: [],
    title: 'Mock Sheet'
  },
  
  mockDoc: {
    sheetsByTitle: {},
    sheetsById: {},
    loadInfo: jest.fn().mockResolvedValue({}),
    addSheet: jest.fn().mockImplementation((options) => {
      const newSheet = { ...sheetsMock.mockSheet, title: options.title };
      sheetsMock.mockDoc.sheetsByTitle[options.title] = newSheet;
      return Promise.resolve(newSheet);
    }),
    useApiKey: jest.fn(),
    useServiceAccountAuth: jest.fn().mockResolvedValue({}),
  }
};

/**
 * Setup a mock for GoogleSpreadsheet
 * @returns {Object} Mock implementation
 */
function setupGoogleSheetsMock() {
  // Initialize sheets by title for each test
  sheetsMock.mockDoc.sheetsByTitle = {
    'Products': { ...sheetsMock.mockSheet, title: 'Products' },
    'Inventory': { ...sheetsMock.mockSheet, title: 'Inventory' },
    'Locations': { ...sheetsMock.mockSheet, title: 'Locations' }
  };
  
  // Initialize sheets by ID
  sheetsMock.mockDoc.sheetsById = {
    0: sheetsMock.mockDoc.sheetsByTitle['Products'],
    1: sheetsMock.mockDoc.sheetsByTitle['Inventory'],
    2: sheetsMock.mockDoc.sheetsByTitle['Locations']
  };
  
  // Create mock constructor
  const GoogleSpreadsheet = jest.fn().mockImplementation(() => {
    return sheetsMock.mockDoc;
  });
  
  return {
    GoogleSpreadsheet,
    sheetsMock
  };
}

module.exports = {
  setupGoogleSheetsMock
};
