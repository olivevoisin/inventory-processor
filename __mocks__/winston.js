const format = {
  combine: jest.fn().mockReturnValue({}),
  timestamp: jest.fn().mockReturnValue({}),
  errors: jest.fn().mockReturnValue({}),
  splat: jest.fn().mockReturnValue({}),
  json: jest.fn().mockReturnValue({}),
  printf: jest.fn().mockImplementation(fn => fn),
  colorize: jest.fn().mockReturnValue({})
};

module.exports = {
  format,
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }),
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
};