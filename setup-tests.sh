#!/bin/bash

# Make sure these directories exist
mkdir -p __tests__/helpers

# Create setup file for Jest
echo '// Set test environment variable
process.env.NODE_ENV = "test";

// Configure timeout for all tests
jest.setTimeout(30000);

// Set up mock environment variables for testing
process.env.GOOGLE_SHEETS_API_KEY = "mock-api-key";
process.env.GOOGLE_SHEET_ID = "mock-sheet-id";
process.env.DEEPGRAM_API_KEY = "mock-deepgram-key";
process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY = "mock-translate-key";
process.env.UPLOAD_DIR = "./uploads";

// Global before all tests
beforeAll(async () => {
  console.log("Starting test suite execution...");
});

// Global after all tests
afterAll(async () => {
  console.log("Completed test suite execution");
  
  // Add cleanup operations here if needed
  jest.clearAllMocks();
});

// Global beforeEach
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});' > __tests__/helpers/jest.setup.js

# Create test runner script
echo '#!/bin/bash

# Set NODE_ENV to test to ensure consistent behavior
export NODE_ENV=test

# Clear Jest cache
echo "Clearing Jest cache..."
npx jest --clearCache

# Run invoice-service.test.js with --no-cache to prevent caching issues
echo "Running invoice-service tests..."
npx jest __tests__/unit/modules/invoice-service.test.js --no-cache --verbose

# If successful, run invoice-flow.test.js
if [ $? -eq 0 ]; then
  echo -e "\nRunning invoice-flow tests..."
  npx jest __tests__/integration/end-to-end/invoice-flow.test.js --no-cache --verbose
fi' > run-tests.sh

chmod +x run-tests.sh

echo "Setup completed successfully."
