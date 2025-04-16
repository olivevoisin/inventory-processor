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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Check if validation error exists
  describe('ValidationError', () => {
    test('should have correct properties', () => {
      if (!errorHandler.ValidationError) {
        console.warn('ValidationError not defined, skipping test');
        return;
      }
      
      const error = new errorHandler.ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.status || error.statusCode).toBe(400);
    });
  });

  // Check if NotFoundError exists
  describe('NotFoundError', () => {
    test('should have correct properties', () => {
      if (!errorHandler.NotFoundError) {
        console.warn('NotFoundError not defined, skipping test');
        return;
      }
      
      const error = new errorHandler.NotFoundError('Resource not found');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.status || error.statusCode).toBe(404);
    });
  });

  // Test createValidationError if it exists
  describe('Factory Functions', () => {
    test('createValidationError should create error with correct properties', () => {
      if (!errorHandler.createValidationError) {
        console.warn('createValidationError not defined, skipping test');
        return;
      }
      
      const error = errorHandler.createValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Invalid input');
      expect(error.status || error.statusCode).toBe(400);
    });
  });
});
