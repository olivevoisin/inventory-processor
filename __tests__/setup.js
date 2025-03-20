// jest.setup.js or __tests__/setup.js (depending on where you decide to place it)

beforeAll(() => {
    // Set up environment variables for testing
    process.env.NODE_ENV = 'test';
    
    // Google Sheets configuration
    process.env.GOOGLE_SHEETS_DOC_ID = 'test_sheet_id';
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'test@example.com';
    process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'test_private_key';
    
    // Google Translation configuration
    process.env.GOOGLE_TRANSLATE_PROJECT_ID = 'test-project-id';
    process.env.GOOGLE_TRANSLATE_KEY_FILENAME = 'test-key-file.json';
    
    // OCR service configuration
    process.env.OCR_API_KEY = 'test_ocr_key';
    process.env.OCR_API_ENDPOINT = 'https://api.ocr-service.com/extract';
    
    // Translation service configuration
    process.env.TRANSLATION_API_KEY = 'test_translation_key';
    process.env.TRANSLATION_API_ENDPOINT = 'https://api.translation-service.com/translate';
    
    // Deepgram configuration
    process.env.DEEPGRAM_API_KEY = 'test_deepgram_key';
    process.env.DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';
    
    // Authentication & security
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.API_KEY = 'test_api_key';
    
    // App configuration
    process.env.PORT = '3001';
    process.env.HOST = 'localhost';
    
    // Storage paths
    process.env.UPLOAD_DIR = './test-uploads';
    process.env.TEMP_DIR = './test-temp';
    
    // Notification settings
    process.env.EMAIL_SERVICE = 'test';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'test_password';
    
    // Set longer timeout for tests
    jest.setTimeout(10000);
  });
  
  afterAll(() => {
    // Clean up any resources that need to be released
    
    // Reset environment variables if needed
    // process.env.NODE_ENV = undefined;
    
    // Clean up any mocks that might have side effects
    jest.restoreAllMocks();
  });
  
  // Global test helpers
  global.waitFor = async (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Mock console methods to reduce noise during tests
  // Uncomment this section if you want to suppress console output during tests
  /*
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
  */