// Setup file for Google Sheets tests

// Add any missing methods to module for consistent testing
module.exports = function setupGoogleSheetsTests(googleSheets) {
  // Add updateRow method if it doesn't exist
  if (!googleSheets.updateRow) {
    googleSheets.updateRow = jest.fn().mockImplementation(async (sheetName, rowIndex, data) => {
      if (rowIndex <= 0) return false;
      return true;
    });
  }
  
  // Add any other missing methods here
  
  return googleSheets;
};
