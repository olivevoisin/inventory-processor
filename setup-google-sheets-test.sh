#!/bin/bash

# Script to set up mocks for Google Sheets testing

# Create the mock directory if it doesn't exist
mkdir -p __mocks__

# Create mock for Google Sheets module
if [ ! -f "__mocks__/google-spreadsheet.js" ]; then
  cat > "__mocks__/google-spreadsheet.js" << EOL
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
EOL
  echo "Created __mocks__/google-spreadsheet.js"
fi

# Set up environment variables for testing Google Sheets
echo "Setting up test environment variables for Google Sheets"
export GOOGLE_SHEETS_ENABLED=false
export GOOGLE_SHEETS_DOC_ID=test-document-id
export GOOGLE_SHEETS_CLIENT_EMAIL=test@example.com
export GOOGLE_SHEETS_PRIVATE_KEY=test-private-key

echo "Google Sheets test setup completed"