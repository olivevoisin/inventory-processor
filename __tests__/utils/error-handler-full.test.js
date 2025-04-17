/**
 * Tests for error-handler.js
 */
const errorHandler = require('../../utils/error-handler');
const logger = require('../../utils/logger');

// Mock the logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Error Handler', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false
    };
    mockNext = jest.fn();
  });

  describe('Error Classes', () => {
    test('BaseError should have correct properties', () => {
      const error = new errorHandler.BaseError('Base issue', 501, 'CustomBase');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('CustomBase');
      expect(error.message).toBe('Base issue');
      expect(error.status).toBe(501);
      expect(error.statusCode).toBe(501);
    });

    test('ValidationError should have correct properties', () => {
      const error = new errorHandler.ValidationError('Invalid input');
      expect(error).toBeInstanceOf(errorHandler.BaseError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.status).toBe(400);
    });

    test('NotFoundError should have correct properties', () => {
      const error = new errorHandler.NotFoundError('Resource not found');
      expect(error).toBeInstanceOf(errorHandler.BaseError);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.status).toBe(404);
    });

    test('AuthenticationError should have correct properties', () => {
      const error = new errorHandler.AuthenticationError('Bad token');
      expect(error).toBeInstanceOf(errorHandler.BaseError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Bad token');
      expect(error.status).toBe(401);
    });

    test('AuthorizationError should have correct properties', () => {
      const error = new errorHandler.AuthorizationError('Admin required');
      expect(error).toBeInstanceOf(errorHandler.BaseError);
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Admin required');
      expect(error.status).toBe(403);
    });

    test('ExternalServiceError should have correct properties', () => {
      const error = new errorHandler.ExternalServiceError('Google API', 'Rate limit exceeded');
      expect(error).toBeInstanceOf(errorHandler.BaseError);
      expect(error.name).toBe('ExternalServiceError');
      expect(error.message).toBe('Google API Error: Rate limit exceeded');
      expect(error.status).toBe(503);
      expect(error.serviceName).toBe('Google API');
    });

    test('ExternalServiceError should use default service name', () => {
      const error = new errorHandler.ExternalServiceError(undefined, 'Timeout');
      expect(error.message).toBe('External Service Error: Timeout');
      expect(error.serviceName).toBe('External Service');
    });
  });

  describe('Factory Functions', () => {
    test('createValidationError should create ValidationError', () => {
      const error = errorHandler.createValidationError('Field required');
      expect(error).toBeInstanceOf(errorHandler.ValidationError);
      expect(error.message).toBe('Field required');
      expect(error.status).toBe(400);
    });
  });

  describe('handleError Middleware', () => {
    test('should handle custom BaseError correctly', () => {
      const error = new errorHandler.NotFoundError('Item not found');
      errorHandler.handleError(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'NotFoundError (404): Item not found',
        expect.objectContaining({ path: '/test', method: 'GET' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Item not found',
        code: 'NotFoundError'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle generic Error correctly', () => {
      const error = new Error('Something broke');
      errorHandler.handleError(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Error (500): Something broke',
        expect.objectContaining({ path: '/test', method: 'GET' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Something broke',
        code: 'Error'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should use default message for error without message', () => {
      const error = new Error(); // No message
      error.status = 502;
      errorHandler.handleError(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Error (502): Internal Server Error', // Uses default message
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(502);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error', // Uses default message
        code: 'Error'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should call next if headers already sent', () => {
      const error = new errorHandler.ValidationError('Bad request');
      mockRes.headersSent = true; // Simulate headers already sent

      errorHandler.handleError(error, mockReq, mockRes, mockNext);

      // Logger should still be called
      expect(logger.error).toHaveBeenCalledWith(
        'ValidationError (400): Bad request',
        expect.any(Object)
      );
      // Response methods should NOT be called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      // next should be called with the error
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
