/**
 * Logger Test
 */

const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
};

// Save original console methods before mocking
const originalConsole = { ...console };

// Mock the console object
global.console = {
  ...console,
  ...mockConsole
};

// Mock environment for testing
let originalEnv;
let logger;

describe('Logger', () => {
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset mock calls
    jest.resetModules();
    
    // Make sure NODE_ENV is not 'test' for the main test cases
    process.env.NODE_ENV = 'development';
    
    // Import logger after mocks are set up (use absolute path)
    logger = require('../../../utils/logger');
  });
  
  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    // Restore original console
    global.console = originalConsole;
  });
  
  test('info should call console.log', () => {
    logger.info('test message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test message'));
  });
  
  test('error should call console.error', () => {
    logger.error('test error');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('test error'));
  });
  
  test('warn should call console.warn', () => {
    logger.warn('test warning');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('test warning'));
  });
  
  test('debug should call console.debug in debug mode', () => {
    process.env.DEBUG = 'true';
    logger.debug('test debug');
    expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('test debug'));
  });
  
  test('debug should not call console.debug when not in debug mode', () => {
    delete process.env.DEBUG;
    logger.debug('test debug');
    expect(console.debug).not.toHaveBeenCalled();
  });
  
  test('should not log in test environment', () => {
    // Now set NODE_ENV to 'test'
    process.env.NODE_ENV = 'test';
    
    // Re-import logger to ensure it picks up the new environment
    jest.resetModules();
    const testLogger = require('../../../utils/logger');
    
    // Clear any previous calls
    jest.clearAllMocks();
    
    testLogger.info('test in test env');
    testLogger.error('error in test env');
    testLogger.warn('warn in test env');
    
    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
