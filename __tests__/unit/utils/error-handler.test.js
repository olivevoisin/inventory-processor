/**
 * Tests for error-handler utility
 */
const errorHandler = require('../../../utils/error-handler');
const logger = require('../../../utils/logger');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

describe('Error Handler Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Error Classes', () => {
    test('ValidationError should have correct properties', () => {
      const error = new errorHandler.ValidationError('Validation failed', { field: 'name' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.fields).toEqual({ field: 'name' });
      expect(error.status).toBe(400);
    });

    test('AuthenticationError should have correct properties', () => {
      const error = new errorHandler.AuthenticationError('Authentication failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication failed');
      expect(error.status).toBe(401);
    });

    test('AuthorizationError should have correct properties', () => {
      const error = new errorHandler.AuthorizationError('Not authorized');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Not authorized');
      expect(error.status).toBe(403);
    });

    test('NotFoundError should have correct properties', () => {
      const error = new errorHandler.NotFoundError('Resource not found');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.status).toBe(404);
    });

    test('ConflictError should have correct properties', () => {
      const error = new errorHandler.ConflictError('Resource already exists');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ConflictError');
      expect(error.message).toBe('Resource already exists');
      expect(error.status).toBe(409);
    });

    test('RateLimitError should have correct properties', () => {
      const error = new errorHandler.RateLimitError('Too many requests');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Too many requests');
      expect(error.status).toBe(429);
    });

    test('ExternalServiceError should have correct properties', () => {
      const error = new errorHandler.ExternalServiceError('API', 'Service failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ExternalServiceError');
      expect(error.message).toBe('Service failed');
      expect(error.service).toBe('API');
      expect(error.status).toBe(502);
    });

    test('InternalError should have correct properties', () => {
      const error = new errorHandler.InternalError('Internal error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('InternalError');
      expect(error.message).toBe('Internal error');
      expect(error.status).toBe(500);
    });
  });

  describe('Error Factory Methods', () => {
    test('createValidationError should create ValidationError', () => {
      const error = errorHandler.createValidationError('Validation failed', { field: 'name' });
      
      expect(error).toBeInstanceOf(errorHandler.ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.fields).toEqual({ field: 'name' });
    });

    test('createAuthenticationError should create AuthenticationError', () => {
      const error = errorHandler.createAuthenticationError('Authentication failed');
      
      expect(error).toBeInstanceOf(errorHandler.AuthenticationError);
      expect(error.message).toBe('Authentication failed');
    });

    test('createAuthorizationError should create AuthorizationError', () => {
      const error = errorHandler.createAuthorizationError('Not authorized');
      
      expect(error).toBeInstanceOf(errorHandler.AuthorizationError);
      expect(error.message).toBe('Not authorized');
    });

    test('createNotFoundError should create NotFoundError', () => {
      const error = errorHandler.createNotFoundError('Resource not found');
      
      expect(error).toBeInstanceOf(errorHandler.NotFoundError);
      expect(error.message).toBe('Resource not found');
    });

    test('createConflictError should create ConflictError', () => {
      const error = errorHandler.createConflictError('Resource already exists');
      
      expect(error).toBeInstanceOf(errorHandler.ConflictError);
      expect(error.message).toBe('Resource already exists');
    });

    test('createRateLimitError should create RateLimitError', () => {
      const error = errorHandler.createRateLimitError('Too many requests');
      
      expect(error).toBeInstanceOf(errorHandler.RateLimitError);
      expect(error.message).toBe('Too many requests');
    });

    test('createExternalServiceError should create ExternalServiceError', () => {
      const error = errorHandler.createExternalServiceError('API', 'Service failed');
      
      expect(error).toBeInstanceOf(errorHandler.ExternalServiceError);
      expect(error.message).toBe('Service failed');
      expect(error.service).toBe('API');
    });

    test('createInternalError should create InternalError', () => {
      const error = errorHandler.createInternalError('Internal error');
      
      expect(error).toBeInstanceOf(errorHandler.InternalError);
      expect(error.message).toBe('Internal error');
    });
  });

  describe('Error Middleware', () => {
    test('errorMiddleware should handle custom errors', () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      const error = new errorHandler.ValidationError('Validation failed');

      errorHandler.errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Validation failed'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('errorMiddleware should handle regular errors', () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      const error = new Error('Regular error');

      errorHandler.errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Regular error'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('errorMiddleware should set default error message for empty errors', () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      const error = new Error();
      error.message = '';

      errorHandler.errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Internal server error'
      }));
    });
  });

  describe('Async Handler', () => {
    test('asyncHandler should pass through non-async functions', () => {
      const mockHandler = jest.fn((req, res) => {
        res.status(200).json({ success: true });
      });
      const wrappedHandler = errorHandler.asyncHandler(mockHandler);
      
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      wrappedHandler(mockReq, mockRes, mockNext);

      expect(mockHandler).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    test('asyncHandler should handle rejected promises', async () => {
      const error = new Error('Async error');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = errorHandler.asyncHandler(mockHandler);
      
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(mockHandler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('asyncHandler should handle async functions that throw', async () => {
      const error = new Error('Async throw error');
      const mockHandler = jest.fn().mockImplementation(async () => {
        throw error;
      });
      const wrappedHandler = errorHandler.asyncHandler(mockHandler);
      
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(mockHandler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('asyncHandler should handle resolved promises', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = errorHandler.asyncHandler(mockHandler);
      
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(mockHandler).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Custom Error Messages', () => {
    test('should format error messages correctly', () => {
      const error = errorHandler.createNotFoundError('User with ID 123 not found');
      
      expect(error.message).toBe('User with ID 123 not found');
    });

    test('should handle objects in error messages', () => {
      const data = { id: 123, name: 'test' };
      const error = errorHandler.createValidationError(`Invalid data: ${JSON.stringify(data)}`);
      
      expect(error.message).toBe('Invalid data: {"id":123,"name":"test"}');
    });
  });
});