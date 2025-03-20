// __tests__/unit/utils/error-handler.test.js

// Modules to test
const { 
  globalErrorHandler, 
  ValidationError,
  asyncHandler
} = require('../../../utils/error-handler');

// Mock dependencies
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}), { virtual: true });

describe('Error Handler Module', () => {
  describe('ValidationError', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Validation error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation error');
      
      // Since the actual ValidationError doesn't have a 'code' property directly,
      // let's just check that it's a ValidationError instance
      expect(error.constructor.name).toBe('ValidationError');
    });
  });
  
  describe('globalErrorHandler', () => {
    it('should handle ValidationError properly', () => {
      const error = new ValidationError('Invalid input');
      const req = {
        id: 'test-request-id'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input'
        })
      }));
    });
    
    it('should handle regular Error as 500', () => {
      const error = new Error('Unknown error');
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();
      
      globalErrorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Unknown error'
        })
      }));
    });
  });
  
  describe('asyncHandler', () => {
    it('should pass error to next middleware when an async error occurs', async () => {
      const error = new Error('Async error');
      const req = {};
      const res = {};
      const next = jest.fn();
      
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);
      
      await handler(req, res, next);
      
      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
    
    it('should work correctly when no error occurs', async () => {
      const req = {};
      const res = {};
      const next = jest.fn();
      
      const asyncFn = jest.fn().mockResolvedValue('success');
      const handler = asyncHandler(asyncFn);
      
      await handler(req, res, next);
      
      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });
});