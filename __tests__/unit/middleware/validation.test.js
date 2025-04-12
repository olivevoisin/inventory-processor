const { validateRequestBody, validateQueryParams } = require('../../../middleware/validation');
<<<<<<< HEAD

// Create mock express request/response/next
const mockRequest = (body = {}, query = {}) => ({ body, query });
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

// Mock the error handler
jest.mock('../../../utils/error-handler', () => {
  const ValidationError = class ValidationError extends Error {
    constructor(message, fields = {}) {
      super(message);
      this.name = 'ValidationError';
      this.fields = fields;
      this.status = 400;
    }
  };
  
  return {
    ValidationError,
    handleError: jest.fn((err, req, res, next) => next(err))
  };
});

// Import error handler after mocking
const errorHandler = require('../../../utils/error-handler');

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('module loads correctly', () => {
    expect(validateRequestBody).toBeDefined();
    expect(validateQueryParams).toBeDefined();
  });
  
  test('validateRequestBody checks required fields', () => {
    // Setup
    const middleware = validateRequestBody(['product', 'quantity']);
    const req = mockRequest({ product: 'Widget' }); // Missing 'quantity'
    const res = mockResponse();
    
    // Execute
    middleware(req, res, mockNext);
    
    // Verify
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(errorHandler.ValidationError);
    expect(error.message).toBe('Missing required fields: quantity');
  });
  
  test('validateQueryParams checks required parameters', () => {
    // Setup
    const middleware = validateQueryParams(['productId', 'location']);
    const req = mockRequest({}, { productId: '123' }); // Missing 'location'
    const res = mockResponse();
    
    // Execute
    middleware(req, res, mockNext);
    
    // Verify
    expect(mockNext).toHaveBeenCalled();
    const error = mockNext.mock.calls[0][0];
    expect(error).toBeInstanceOf(errorHandler.ValidationError);
    expect(error.message).toBe('Missing required parameters: location');
=======
const { ValidationError } = require('../../../utils/error-handler');

// Mock the logger to prevent console output during tests
jest.mock('../../../utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Set environment variable to ensure validation runs during tests
process.env.TEST_VALIDATION = 'true';

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  
  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });
  
  describe('validateRequestBody', () => {
    test('should pass when all required fields are present', () => {
      mockReq = {
        body: {
          field1: 'value1',
          field2: 'value2'
        }
      };
      
      const middleware = validateRequestBody(['field1', 'field2']);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext.mock.calls.length).toBe(1);
    });
    
    test('should call next with ValidationError when body is missing', () => {
      mockReq = {}; // No body
      
      const middleware = validateRequestBody(['field1']);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext.mock.calls[0][0].message).toContain('Corps de requête manquant');
    });
    
    test('should call next with ValidationError when required fields are missing', () => {
      mockReq = {
        body: {
          field1: 'value1'
          // field2 is missing
        }
      };
      
      const middleware = validateRequestBody(['field1', 'field2']);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext.mock.calls[0][0].message).toContain('field2');
    });
    
    test('should handle empty required fields array', () => {
      mockReq = {
        body: {}
      };
      
      const middleware = validateRequestBody([]);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });
    
    test('should skip validation in test environment without TEST_VALIDATION flag', () => {
      // Save original env vars
      const originalNodeEnv = process.env.NODE_ENV;
      const originalTestValidation = process.env.TEST_VALIDATION;
      
      // Set env vars for this test
      process.env.NODE_ENV = 'test';
      delete process.env.TEST_VALIDATION;
      
      try {
        mockReq = {}; // No body, which would normally cause validation error
        
        const middleware = validateRequestBody(['field1']);
        middleware(mockReq, mockRes, mockNext);
        
        // Should skip validation and call next without error
        expect(mockNext).toHaveBeenCalledWith();
      } finally {
        // Restore original env vars
        process.env.NODE_ENV = originalNodeEnv;
        process.env.TEST_VALIDATION = originalTestValidation;
      }
    });
  });
  
  describe('validateQueryParams', () => {
    test('should pass when all required parameters are present', () => {
      mockReq = {
        query: {
          param1: 'value1',
          param2: 'value2'
        }
      };
      
      const middleware = validateQueryParams(['param1', 'param2']);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });
    
    test('should call next with ValidationError when required parameters are missing', () => {
      mockReq = {
        query: {
          param1: 'value1'
          // param2 is missing
        }
      };
      
      const middleware = validateQueryParams(['param1', 'param2']);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext.mock.calls[0][0].message).toContain('param2');
    });
    
    test('should handle empty required parameters array', () => {
      mockReq = {
        query: {}
      };
      
      const middleware = validateQueryParams([]);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });
    
    test('should skip validation in test environment without TEST_VALIDATION flag', () => {
      // Save original env vars
      const originalNodeEnv = process.env.NODE_ENV;
      const originalTestValidation = process.env.TEST_VALIDATION;
      
      // Set env vars for this test
      process.env.NODE_ENV = 'test';
      delete process.env.TEST_VALIDATION;
      
      try {
        mockReq = {
          query: {} // Missing params, which would normally cause validation error
        };
        
        const middleware = validateQueryParams(['param1']);
        middleware(mockReq, mockRes, mockNext);
        
        // Should skip validation and call next without error
        expect(mockNext).toHaveBeenCalledWith();
      } finally {
        // Restore original env vars
        process.env.NODE_ENV = originalNodeEnv;
        process.env.TEST_VALIDATION = originalTestValidation;
      }
    });
>>>>>>> backup-main
  });
});
