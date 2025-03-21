const sinon = require('sinon');

// Mock for Google Sheets API
function setupGoogleSheetsMock() {
  // Create stubs for Google Sheets operations
  const mockSheets = {
    spreadsheets: {
      values: {
        get: sinon.stub().resolves({
          data: {
            values: [
              ['Product', 'Quantity', 'Price'],
              ['Wine', '10', '15.99'],
              ['Beer', '24', '5.99']
            ]
          }
        }),
        append: sinon.stub().resolves({
          data: {
            updates: {
              updatedRange: 'Sheet1!A1:C3',
              updatedRows: 2,
              updatedColumns: 3,
              updatedCells: 6
            }
          }
        }),
        update: sinon.stub().resolves({
          data: {
            updatedRange: 'Sheet1!A1:C3',
            updatedRows: 2,
            updatedColumns: 3,
            updatedCells: 6
          }
        })
      },
      create: sinon.stub().resolves({
        data: {
          spreadsheetId: 'mock-spreadsheet-id',
          properties: {
            title: 'Inventory Sheet'
          }
        }
      })
    }
  };

  // Mock auth client
  const mockAuth = {
    getClient: sinon.stub().resolves({
      authorize: sinon.stub().resolves({}),
      setCredentials: sinon.stub()
    })
  };

  return {
    mockSheets,
    mockAuth
  };
}

module.exports = {
  setupGoogleSheetsMock
};
