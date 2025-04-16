// Mock for google-spreadsheet module
const mockSheet = {
  getRows: jest.fn().mockResolvedValue([]),
  addRow: jest.fn().mockResolvedValue({}),
  getInfo: jest.fn().mockResolvedValue({ worksheets: [] })
};

const mockSpreadsheet = {
  useServiceAccountAuth: jest.fn().mockResolvedValue(null),
  loadInfo: jest.fn().mockResolvedValue(null),
  addSheet: jest.fn().mockResolvedValue(mockSheet),
  sheetsByTitle: {},
  sheetsByIndex: [mockSheet]
};

class MockGoogleSpreadsheet {
  constructor() {
    Object.assign(this, mockSpreadsheet);
  }
}

module.exports = {
  GoogleSpreadsheet: MockGoogleSpreadsheet
};
