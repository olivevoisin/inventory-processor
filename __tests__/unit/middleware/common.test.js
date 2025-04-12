/**
 * Unit tests for common middleware
 */
const commonMiddleware = require('../../../middleware/common');
const monitoring = require('../../../utils/monitoring');
const logger = require('../../../utils/logger');

// Mock the monitoring and logger modules
jest.mock('../../../utils/monitoring', () => ({
  recordApiUsage: jest.fn(),
  recordError: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Common Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock request, response, and next function
    req = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test',
      headers: {},
      body: {},
      ip: '127.0.0.1',
      startTime: Date.now()
    };

    res = {
      statusCode: 200,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      locals: {},
      headersSent: false,
      on: jest.fn(),
      once: jest.fn(),
      end: jest.fn()
    };

    next = jest.fn();
  });

  test('module loads correctly', () => {
    expect(commonMiddleware).toBeDefined();
    expect(commonMiddleware.trackApiCall).toBeDefined();
    expect(commonMiddleware.validateRequest).toBeDefined();
    expect(commonMiddleware.standardizeResponse).toBeDefined();
    expect(commonMiddleware.errorHandler).toBeDefined();
    expect(commonMiddleware.setupMiddleware).toBeDefined();
  });

  describe('trackApiCall', () => {
    test('should log API calls and add startTime', () => {
      // Execute middleware
      commonMiddleware.trackApiCall(req, res, next);

      // Verify it logs the request and calls next
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Incoming request'), expect.any(Object));
      expect(req.startTime).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    test('should handle requests without path property', () => {
      // Remove path from request
      delete req.path;
      req.url = '/api/test-url';

      // Execute middleware
      commonMiddleware.trackApiCall(req, res, next);

      // Should still log and call next
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Incoming request'), expect.any(Object));
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateRequest', () => {
    test('should validate request body', () => {
      // Execute middleware
      commonMiddleware.validateRequest(req, res, next);

      // Verify it calls next
      expect(next).toHaveBeenCalled();
    });
  });

  describe('standardizeResponse', () => {
    test('should override res.end method', () => {
      // Store original end method
      const originalEnd = res.end;
      
      // Execute middleware
      commonMiddleware.standardizeResponse(req, res, next);

      // Verify it overrides the end method
      expect(res.end).not.toBe(originalEnd);
      expect(next).toHaveBeenCalled();
      
      // Call the new end method to test its functionality
      const mockChunk = 'test chunk';
      const mockEncoding = 'utf8';
      
      // Mock Date.now to return a fixed value for the test
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(req.startTime + 100);
      
      // Call the new end method
      res.end(mockChunk, mockEncoding);
      
      // Restore Date.now
      Date.now = originalNow;
      
      // Verify it sets the X-Response-Time header
      expect(res.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
      expect(originalEnd).toHaveBeenCalledWith(mockChunk, mockEncoding);
    });

    test('should set X-Response-Time even if startTime is missing', () => {
      // Remove startTime from request
      delete req.startTime;

      // Execute middleware
      commonMiddleware.standardizeResponse(req, res, next);

      // Mock Date.now for consistent testing
      const originalNow = Date.now;
      const mockTime = originalNow();
      Date.now = jest.fn()
        .mockReturnValueOnce(mockTime)      // First call (in middleware)
        .mockReturnValueOnce(mockTime + 50); // Second call (in end method)
      
      // Call the end method to trigger the response time calculation
      res.end();
      
      // Restore Date.now
      Date.now = originalNow;

      // Should still set a header
      expect(res.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
    });
    
    test('should not set header if headers already sent', () => {
      // Execute middleware
      commonMiddleware.standardizeResponse(req, res, next);
      
      // Set headersSent to true
      res.headersSent = true;
      
      // Call the end method
      res.end();
      
      // Should not try to set the header
      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    test('should handle API errors with status code', () => {
      // Create API error with status code
      const apiError = new Error('API Error');
      apiError.statusCode = 400;

      // Execute middleware
      commonMiddleware.errorHandler(apiError, req, res, next);

      // Should set status code and return error response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'API Error'
      });
    });

    test('should handle validation errors', () => {
      // Create validation error
      const validationError = new Error('Validation Error');
      validationError.name = 'ValidationError';

      // Execute middleware
      commonMiddleware.errorHandler(validationError, req, res, next);

      // Should set status 400 for validation errors
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error'
      });
    });

    test('should handle unknown errors with 500 status', () => {
      // Create generic error
      const genericError = new Error('Unknown Error');

      // Execute middleware
      commonMiddleware.errorHandler(genericError, req, res, next);

      // Should set status 500 for unknown errors
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error'
      });
    });
    
    test('should call next if headers already sent', () => {
      // Create generic error
      const genericError = new Error('Unknown Error');
      
      // Set headersSent to true
      res.headersSent = true;
      
      // Execute middleware
      commonMiddleware.errorHandler(genericError, req, res, next);
      
      // Should not set status or json
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      
      // Should call next with the error
      expect(next).toHaveBeenCalledWith(genericError);
    });
  });

  describe('setupMiddleware', () => {
    test('should add middleware to app', () => {
      const app = {
        use: jest.fn()
      };
      
      commonMiddleware.setupMiddleware(app);
      
      // Should call app.use at least once
      expect(app.use).toHaveBeenCalled();
    });
  });
});