const globalErrorHandler = require('../../middleware/globalErrorHandler');

describe('Global Error Handler Middleware', () => {
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

  test('should respond with status 500 and error message for a generic error', () => {
    // Create a generic error
    const error = new Error('Something went wrong');
    
    // Call middleware with the error
    globalErrorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    
    // Verify response was sent with correct status code and message
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong'
    });
  });

  test('should use custom status code if provided in the error', () => {
    // Create an error with custom status code
    const error = new Error('Not Found');
    error.status = 404;
    
    // Call middleware with the error
    globalErrorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify response was sent with custom status code
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Not Found'
    });
  });

  test('should use default message if error has no message property', () => {
    // Create an error without a message
    const error = { stack: 'Error stack without message' };
    
    // Call middleware with the error
    globalErrorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify response was sent with default message
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal Server Error'
    });
  });

  test('should handle errors with additional properties', () => {
    // Create an error with additional properties
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = [
      { field: 'email', message: 'Invalid email format' }
    ];
    
    // Call middleware with the error
    globalErrorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify response includes only the message, not additional properties
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed'
    });
  });

  test('should handle non-Error objects', () => {
    // Create a non-Error object (like a string)
    const error = 'Something went wrong';
    
    // Call middleware with the non-Error object
    globalErrorHandler(error, mockRequest, mockResponse, mockNext);
    
    // Verify response with default status and the string as message
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal Server Error'
    });
  });
});
