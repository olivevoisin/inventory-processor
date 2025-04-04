// Set up environment for tests
process.env.NODE_ENV = 'test';
process.env.API_KEY = 'test-api-key';

// Mock console methods to avoid output during tests
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Global beforeEach to clear mocks
beforeEach(() => {
  jest.clearAllMocks();
});
