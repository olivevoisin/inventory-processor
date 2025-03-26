// __tests__/mocks/google-sheets-mock.js
/**
 * Mock implementation of the Google Sheets API
 */
const sinon = require('sinon');

class MockGoogleSpreadsheet {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.loadInfo = sinon.stub().resolves();
    this.sheetsByTitle = {};
    this.sheetsByIndex = [];
    this.addSheet = sinon.stub().callsFake(({ title, headerValues }) => {
      const newSheet = new MockSheet(title, headerValues);
      this.sheetsByTitle[title] = newSheet;
      this.sheetsByIndex.push(newSheet);
      return Promise.resolve(newSheet);
    });
  }
  
  setSheets(sheets) {
    sheets.forEach(sheet => {
      this.sheetsByTitle[sheet.title] = sheet;
      this.sheetsByIndex.push(sheet);
    });
  }
}

class MockSheet {
  constructor(title, headerValues = []) {
    this.title = title;
    this.headerValues = headerValues;
    this._rows = [];
    
    this.getRows = sinon.stub().callsFake(() => Promise.resolve([...this._rows]));
    this.addRow = sinon.stub().callsFake(rowData => {
      const newRow = { ...rowData, _sheet: this };
      newRow.save = sinon.stub().resolves();
      newRow.delete = sinon.stub().resolves();
      this._rows.push(newRow);
      return Promise.resolve(newRow);
    });
  }
  
  setRows(rows) {
    this._rows = rows.map(row => {
      const newRow = { ...row, _sheet: this };
      newRow.save = sinon.stub().resolves();
      newRow.delete = sinon.stub().resolves();
      return newRow;
    });
  }
}

function setupGoogleSheetsMock(options = {}) {
  const { 
    sheetId = 'test_sheet_id',
    sheets = [],
    inventoryItems = []
  } = options;
  
  const mockDoc = new MockGoogleSpreadsheet(sheetId);
  
  // Add default inventory sheet if not provided
  if (!sheets.some(sheet => sheet.title === 'Inventory')) {
    const inventorySheet = new MockSheet('Inventory', [
      'sku', 'quantity', 'location', 'lastUpdated', 'price'
    ]);
    inventorySheet.setRows(inventoryItems);
    sheets.push(inventorySheet);
  }
  
  mockDoc.setSheets(sheets);
  
  // Mock the GoogleSpreadsheet constructor
  sinon.stub(require('google-spreadsheet'), 'GoogleSpreadsheet')
    .returns(mockDoc);
    
  return mockDoc;
}

module.exports = { 
  MockGoogleSpreadsheet,
  MockSheet,
  setupGoogleSheetsMock
};
