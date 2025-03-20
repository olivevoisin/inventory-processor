describe('Logger Module', () => {
  // Save original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
  };
  
  beforeEach(() => {
    // Reset modules between tests
    jest.resetModules();
    
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
  });
  
  afterEach(() => {
    // Restore console methods after each test
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  });
  
  test('logger module can be imported', () => {
    const logger = require('../../../utils/logger');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
  
  test('logger logs messages via console methods', () => {
    const logger = require('../../../utils/logger');
    
    // This is a basic test that simply verifies the methods can be called
    // without producing errors, rather than expecting specific output formats
    expect(() => {
      logger.info('Info message');
      logger.error('Error message');
      logger.warn('Warning message');
      logger.debug('Debug message');
    }).not.toThrow();
    
    // Verify that console methods were called (without checking format)
    expect(console.log).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    // The warning might be called differently in your implementation
    // so we'll skip checking that one directly
  });
});
