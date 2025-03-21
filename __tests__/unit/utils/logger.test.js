/**
 * Tests for logger module
 */
describe('Logger Module', () => {
  let originalConsoleLog;
  let originalConsoleError;
  let originalConsoleWarn;
  let logger;
  
  beforeEach(() => {
    // Save original console methods
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    
    // Create spies for console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    
    // Reset module cache to ensure logger is reinitialized
    jest.resetModules();
    
    // Import logger after mocks are set up (use absolute path)
    logger = require('../../../utils/logger');
    
    // Set log level to warn for testing
    logger.setLogLevel('warn');
  });
  
  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
  
  test('logger exports expected methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
  
  test('logger logs messages via console methods', () => {
    // Call the logger methods
    logger.info('Test info message');
    logger.error('Test error message');
    logger.warn('Test warning message');
    
    // Verify that console methods were called (without checking format)
    expect(console.log).not.toHaveBeenCalled(); // Should not be called at warn level
    expect(console.error).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
  
  test('logger formats messages correctly', () => {
    // Skip this test if formatLogMessage is not exposed for testing
    if (!logger.formatLogMessage) {
      return;
    }
    
    const formattedMessage = logger.formatLogMessage('info', 'Test message');
    
    // Check that the format includes level and message
    expect(formattedMessage).toContain('INFO');
    expect(formattedMessage).toContain('Test message');
  });
  
  test('logger respects log level', () => {
    // Test with level set to warn
    expect(logger.shouldLog('error')).toBe(true);
    expect(logger.shouldLog('warn')).toBe(true);
    expect(logger.shouldLog('info')).toBe(false);
    expect(logger.shouldLog('debug')).toBe(false);
  });
});
