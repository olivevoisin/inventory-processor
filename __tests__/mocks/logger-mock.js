// __mocks__/logger-mock.js


// __mocks__/logger-mock.js

// Create a mock for the Winston logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  startTimer: jest.fn().mockReturnValue({
    done: jest.fn().mockReturnValue({ duration: 100 })
  })
}));

// Create a mock for the Winston module
const mockWinston = {
  createLogger: jest.fn().mockReturnValue(mockLogger), // Now mockLogger is defined
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
};

// Export the mock logger and Winston module
module.exports = {
  mockLogger,
  mockWinston
};