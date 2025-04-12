// __tests__/setup.js
/**
 * Setup file for Jest tests
 * Configures the test environment
 */

// Set up environment variables for testing
process.env.NODE_ENV = 'test';

// Google Sheets mock configuration
process.env.GOOGLE_SHEETS_DOC_ID = 'test_sheet_id';
process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'test@example.com';
process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'test_private_key';

// API keys for testing
process.env.DEEPGRAM_API_KEY = 'test_deepgram_key';
process.env.TRANSLATION_API_KEY = 'test_translation_key';
process.env.OCR_API_KEY = 'test_ocr_key';

// Global test setup
jest.setTimeout(10000); // Increase timeout for async tests

// Mock external services that should not be called during tests
jest.mock('@deepgram/sdk', () => ({
  Deepgram: jest.fn().mockImplementation(() => ({
    transcription: {
      preRecorded: jest.fn().mockImplementation(() => ({
        transcribe: jest.fn().mockResolvedValue({
          results: {
            channels: [{
              alternatives: [{
                transcript: 'five bottles of wine'
              }]
            }]
          }
        })
      }))
    }
  }))
}));

// Mock Google Translation API
jest.mock('@google-cloud/translate', () => ({
  v2: {
    Translate: jest.fn().mockImplementation(() => ({
      translate: jest.fn().mockResolvedValue(['translated text'])
    }))
  }
}));

// Mock node-cron for scheduled tasks
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn()
  })
}));

// Clean up test artifacts
afterAll(() => {
  // Any cleanup that should happen after all tests run
});
