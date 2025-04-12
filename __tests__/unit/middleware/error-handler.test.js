const { errorHandler } = require('../../../middleware/error-handler');

describe('Middleware Error Handler', () => {
  // Setup mocks
  let mockRequest;
  let mockResponse;
  let mockNext;
  let consoleErrorSpy;

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

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  test('should handle generic errors with 500 status code', () => {
    // Create a generic error
    const error = new Error('Something went wrong');
    
    // Call middleware with the error
    errorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error);
    
    // Verify response was sent with correct status code and message
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Something went wrong'
    });
  });

  test('should use custom status code if provided in the error', () => {
    // Create an error with custom status code
    const error = new Error('Not Found');
    error.statusCode = 404;
    
    // Call middleware with the error
    errorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify response was sent with custom status code
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Not Found'
    });
  });

  test('should use default message for errors without a message', () => {
    // Create an error without a message
    const error = new Error();
    
    // Call middleware with the error
    errorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify response uses default message
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal Server Error'
    });
  });

  test('should handle Multer errors correctly', () => {
    // Create a multer error
    const error = new Error('File too large');
    error.name = 'MulterError';
    
    // Call middleware with the error
    errorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify response was sent with 400 status code for Multer errors
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'File upload error: File too large'
    });
  });

  test('should handle errors with custom properties', () => {
    // Create an error with additional properties
    const error = new Error('Validation error');
    error.statusCode = 400;
    error.details = { field: 'email', message: 'Email is required' };
    
    // Call middleware with the error
    errorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify the status code is used but extra properties aren't included
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation error'
    });
  });
});