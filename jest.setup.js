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


  

  