// __tests__/mocks/logger.js
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn()
  };
  
  module.exports = mockLogger;