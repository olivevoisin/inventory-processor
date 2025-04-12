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
