const logger = require('../../../utils/logger');

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();
console.debug = jest.fn();

describe('Logger', () => {
 // Store original NODE_ENV
 const originalNodeEnv = process.env.NODE_ENV;
 
 beforeEach(() => {
   // Reset mocks
   jest.clearAllMocks();
   // Set NODE_ENV to development for tests
   process.env.NODE_ENV = 'development';
 });
 
 afterEach(() => {
   // Restore NODE_ENV
   process.env.NODE_ENV = originalNodeEnv;
 });
 
 test('info should call console.log', () => {
   logger.info('test message');
   expect(console.log).toHaveBeenCalledWith('[INFO] test message', {});
 });
 
 test('error should call console.error', () => {
   logger.error('test error');
   expect(console.error).toHaveBeenCalledWith('[ERROR] test error', {});
 });
 
 test('warn should call console.warn', () => {
   logger.warn('test warning');
   expect(console.warn).toHaveBeenCalledWith('[WARN] test warning', {});
 });
 
 test('debug should call console.debug in debug mode', () => {
   process.env.DEBUG = 'true';
   logger.debug('test debug');
   expect(console.debug).toHaveBeenCalledWith('[DEBUG] test debug', {});
 });
 
 test('debug should not call console.debug when not in debug mode', () => {
   process.env.DEBUG = 'false';
   logger.debug('test debug');
   expect(console.debug).not.toHaveBeenCalled();
 });
 
 test('should not log in test environment', () => {
   process.env.NODE_ENV = 'test';
   logger.info('test message in test env');
   logger.error('test error in test env');
   logger.warn('test warning in test env');
   logger.debug('test debug in test env');
   
   expect(console.log).not.toHaveBeenCalled();
   expect(console.error).not.toHaveBeenCalled();
   expect(console.warn).not.toHaveBeenCalled();
   expect(console.debug).not.toHaveBeenCalled();
 });
});
