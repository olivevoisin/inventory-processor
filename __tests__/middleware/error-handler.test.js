const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ExternalServiceError,
  asyncHandler
} = require('../../utils/error-handler');

const errorMiddleware = require('../../middleware/error-handler'); // Ensure this path is correct

// Mock the logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  debug: jest.fn()
}));

describe('Error Handler Utilities', () => {
  // Error classes tests
  describe('Error Classes', () => {
    describe('AppError', () => {
      test('should create a basic error with default status code', () => {
        const error = new AppError('Test error');
        
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('AppError');
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.stack).toBeDefined();
      });
      
      test('should create an error with custom status code', () => {
        const error = new AppError('Custom status', 418);
        
        expect(error.statusCode).toBe(418);
      });
    });
    
    describe('ValidationError', () => {
      test('should create a validation error with fields', () => {
        const fields = { email: 'Email is required' };
        const error = new ValidationError('Invalid input', fields);
        
        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('ValidationError');
        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.fields).toEqual(fields);
      });
    });
    
    describe('AuthenticationError', () => {
      test('should create an authentication error with default message', () => {
        const error = new AuthenticationError();
        
        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('AuthenticationError');
        expect(error.message).toBe('Authentication failed');
        expect(error.statusCode).toBe(401);
      });
      
      test('should create an authentication error with custom message', () => {
        const error = new AuthenticationError('Invalid token');
        
        expect(error.message).toBe('Invalid token');
      });
    });
    
    describe('AuthorizationError', () => {
      test('should create an authorization error with default message', () => {
        const error = new AuthorizationError();
        
        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('AuthorizationError');
        expect(error.message).toBe('Not authorized');
        expect(error.statusCode).toBe(403);
      });
    });
    
    describe('NotFoundError', () => {
      test('should create a not found error with default message', () => {
        const error = new NotFoundError();
        
        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
      });
      
      test('should create a not found error with custom resource', () => {
        const error = new NotFoundError('User');
        
        expect(error.message).toBe('User not found');
        expect(error.resource).toBe('User');
        expect(error.resourceId).toBe('');
      });
      
      test('should create a not found error with resource and ID', () => {
        const error = new NotFoundError('User', '123');
        
        expect(error.message).toBe('User with ID 123 not found');
        expect(error.resource).toBe('User');
        expect(error.resourceId).toBe('123');
      });
    });
    
    describe('ExternalServiceError', () => {
      test('should create an external service error', () => {
        const originalError = new Error('Connection timeout');
        const error = new ExternalServiceError('Database', 'Failed to connect', originalError);
        
        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('ExternalServiceError');
        expect(error.message).toBe('Database service error: Failed to connect');
        expect(error.statusCode).toBe(502);
        expect(error.service).toBe('Database');
        expect(error.originalError).toBe(originalError);
      });
    });
  });
  
  // Middleware tests
  describe('asyncHandler', () => {
    test('should wrap async function and pass error to next', async () => {
      // Create mock request, response, and next
      const req = {};
      const res = {};
      const next = jest.fn();
      
      // Create async function that throws
      const asyncFn = async () => {
        throw new Error('Async error');
      };
      
      // Wrap with asyncHandler
      const wrappedFn = asyncHandler(asyncFn);
      
      // Call wrapped function
      await wrappedFn(req, res, next);
      
      // Verify next was called with the error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Async error');
    });
    
    test('should resolve normally if no error is thrown', async () => {
      // Create mock request, response, and next
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      
      // Create async function that succeeds
      const asyncFn = async (req, res) => {
        res.status(200).json({ success: true });
      };
      
      // Wrap with asyncHandler
      const wrappedFn = asyncHandler(asyncFn);
      
      // Call wrapped function
      await wrappedFn(req, res, next);
      
      // Verify next was not called and response was sent
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
  
  describe('errorMiddleware', () => {
    const logger = require('../../utils/logger');
    let mockRequest;
    let mockResponse;
    let mockNext;
    
    beforeEach(() => {
      // Create mock request
      mockRequest = {};
      
      // Create mock response with json and status methods
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      
      // Create mock next function
      mockNext = jest.fn();
      
      // Reset logger mocks
      jest.clearAllMocks();
    });
    
    test('should handle AppError correctly', () => {
      // Create an AppError
      const error = new AppError('Test app error', 400);
      
      // Call middleware with the error
      errorMiddleware(error, mockRequest, mockResponse, mockNext);
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(`${error.name}: ${error.message}`);
      
      // Verify response was sent with correct status code and error details
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test app error',
          type: 'AppError',
          stack: expect.any(String)
        }
      });
    });
    
    test('should handle ValidationError with fields', () => {
      // Create a ValidationError with fields
      const fields = { email: 'Email is required' };
      const error = new ValidationError('Invalid data', fields);
      
      // Call middleware with the error
      errorMiddleware(error, mockRequest, mockResponse, mockNext);
      
      // Verify response includes fields
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Invalid data',
          type: 'ValidationError',
          fields: fields,
          stack: expect.any(String)
        }
      });
    });
    
    test('should handle generic Error', () => {
      // Create a generic Error
      const error = new Error('Generic error');
      
      // Call middleware with the error
      errorMiddleware(error, mockRequest, mockResponse, mockNext);
      
      // Verify response uses default status code
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
    
    test('should hide stack trace in production mode', () => {
      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Set NODE_ENV to production
      process.env.NODE_ENV = 'production';
      
      // Create an error
      const error = new AppError('Production error');
      
      // Call middleware with the error
      errorMiddleware(error, mockRequest, mockResponse, mockNext);
      
      // Verify stack trace is not included
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Production error',
          type: 'AppError'
        }
      });
      
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});