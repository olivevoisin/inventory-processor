// Global setup for Jest tests

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SKIP_AUTH = 'true';
process.env.TEST_MOCK_TRANSLATE = 'true';

// Mock pdf-parse correctly.
// Use the standard jest.mock() which will auto-mock or find the mock in the __mocks__ directory.
jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'Mocked PDF text' }));
