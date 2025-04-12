<<<<<<< HEAD
// __tests__/setup.js
beforeAll(() => {
    // Set up environment variables for testing
    process.env.NODE_ENV = 'test';
    
    // Google Sheets
    process.env.GOOGLE_SHEETS_DOC_ID = 'test_sheet_id';
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'test@example.com';
    process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'test_private_key';
    
    // Other environment variables your app might need
    process.env.OCR_API_KEY = 'test_ocr_key';
    process.env.TRANSLATION_API_KEY = 'test_translation_key';
    
    // Global test setup
    jest.setTimeout(10000);
  });
  
  afterAll(() => {
    // Global teardown
  });


  

  
=======
// Global setup for Jest tests

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SKIP_AUTH = 'true';
process.env.TEST_MOCK_TRANSLATE = 'true';

// Mock PDF-Parse for all tests that might import it
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((pdfBuffer) => {
    if (!pdfBuffer) {
      return Promise.reject(new Error('Invalid PDF buffer'));
    }
    
    return Promise.resolve({
      text: 'Sample PDF Text\nExtracted from mock PDF',
      numpages: 1,
      info: { Title: 'Test Document' }
    });
  });
});
>>>>>>> backup-main
