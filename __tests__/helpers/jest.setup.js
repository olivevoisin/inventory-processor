// Set test environment variable
process.env.NODE_ENV = 'test';

// Configure timeout for all tests
jest.setTimeout(30000);

// Set up mock environment variables for testing
process.env.GOOGLE_SHEETS_API_KEY = 'mock-api-key';
process.env.GOOGLE_SHEET_ID = 'mock-sheet-id';
process.env.DEEPGRAM_API_KEY = 'mock-deepgram-key';
process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY = 'mock-translate-key';
process.env.UPLOAD_DIR = './uploads';

// Global before all tests
beforeAll(async () => {
  console.log('Starting test suite execution...');
});

// Global after all tests
afterAll(async () => {
  console.log('Completed test suite execution');
  
  // Add cleanup operations here if needed
  jest.clearAllMocks();
});

// Global beforeEach
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});
