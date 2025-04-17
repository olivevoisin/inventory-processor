/**
 * Tests for error-handler.js specifically targeting branch coverage
 */
const errorHandler = require('../../utils/error-handler');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Error Handler Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError branches', () => {
    test('should use default values when properties are missing', () => {
      const emptyError = {};
      const req = { originalUrl: '/test', method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      errorHandler.handleError(emptyError, req, res, next);
      
      // Check that default values were used
      expect(res.status).toHaveBeenCalledWith(500); // Default status
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error', // Default message
        code: 'Error' // Default name
      });
    });
    
    test('should handle minimal request object', () => {
      const error = new Error('Test error');
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      errorHandler.handleError(error, req, res, next);
      
      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
    
    test('should handle empty request object', () => {
      const error = new Error('Test error');
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      errorHandler.handleError(error, null, res, next);
      
      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
    
    test('should properly handle headersSent = true', () => {
      const error = new Error('Test error');
      const req = { originalUrl: '/test', method: 'GET' };
      const res = {
        headersSent: true,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      errorHandler.handleError(error, req, res, next);
      
      // Should log the error still
      expect(logger.error).toHaveBeenCalled();
      // Should NOT try to send a response
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      // Should call next with the error
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
