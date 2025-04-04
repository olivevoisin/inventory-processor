const { validateRequestBody, validateQueryParams } = require('../../../middleware/validation');

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
  });
});
