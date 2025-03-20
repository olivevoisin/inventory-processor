// __tests__/mocks/winston.js
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn()
  };
  
  const mockWinston = {
    format: {
      combine: jest.fn().mockReturnValue({}),
      timestamp: jest.fn().mockReturnValue({}),
      printf: jest.fn().mockReturnValue({}),
      colorize: jest.fn().mockReturnValue({}),
      json: jest.fn().mockReturnValue({})
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    },
    createLogger: jest.fn().mockReturnValue(mockLogger)
  };
  
  module.exports = mockWinston;