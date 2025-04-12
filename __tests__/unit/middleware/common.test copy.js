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
      on: jest.fn(),
      once: jest.fn()
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
    test('should add response time header', () => {
      // Execute middleware
      commonMiddleware.standardizeResponse(req, res, next);

      // Verify it sets up a handler for the finish event
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(next).toHaveBeenCalled();

      // Trigger the finish event handler
      const finishHandler = res.on.mock.calls[0][1];
      
      // Mock Date.now to return a fixed value for the test
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(req.startTime + 100);
      
      finishHandler();
      
      // Restore Date.now
      Date.now = originalNow;
      
      // Verify it sets the X-Response-Time header
      expect(res.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
    });

    test('should set X-Response-Time even if startTime is missing', () => {
      // Remove startTime from request
      delete req.startTime;

      // Execute middleware
      commonMiddleware.standardizeResponse(req, res, next);

      // Trigger the 'finish' event
      const finishHandler = res.on.mock.calls[0][1];
      finishHandler();

      // Should still set a header (with a zero or small value)
      expect(res.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringMatching(/\d+ms/));
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
