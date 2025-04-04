// Mock logger before importing
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { validateRequestBody, validateQueryParams } = require('../../middleware/validation');
const logger = require('../../utils/logger');
const { ValidationError } = require('../../utils/error-handler');

// Set environment variable to ensure validation runs during tests
process.env.TEST_VALIDATION = 'true';

describe('Validation Middleware', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequestBody function', () => {
    test('should call next if all required fields are present', () => {
      const req = { 
        body: { field1: 'value1', field2: 'value2' } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = validateRequestBody(['field1', 'field2']);
      middleware(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should return error response if body is missing', () => {
      const req = {}; // No body
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = validateRequestBody(['field1']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing request body')
      });
    });

    test('should return error response if required fields are missing', () => {
      const req = { 
        body: { field1: 'value1' } // Missing field2
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = validateRequestBody(['field1', 'field2']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });

    test('should accept empty array of required fields', () => {
      const req = { body: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = validateRequestBody([]);
      middleware(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    test('should use default empty array if no required fields specified', () => {
      const req = { body: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = validateRequestBody();
      middleware(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    test('should handle falsy values (like 0 or empty string) as valid field values', () => {
      const req = { 
        body: { 
          number: 0, 
          emptyString: '',
          nullValue: null,
          booleanValue: false
        } 
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = validateRequestBody(['number', 'emptyString', 'nullValue', 'booleanValue']);
      middleware(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validateQueryParams function', () => {
    test('should call next if all required parameters are present', () => {
      const req = { 
        query: { param1: 'value1', param2: 'value2' } 
      };
      const res = {};
      const next = jest.fn();

      const middleware = validateQueryParams(['param1', 'param2']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should pass validation error if required parameters are missing', () => {
      const req = { 
        query: { param1: 'value1' } // Missing param2
      };
      const res = {};
      const next = jest.fn();

      const middleware = validateQueryParams(['param1', 'param2']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should accept empty array of required parameters', () => {
      const req = { query: {} };
      const res = {};
      const next = jest.fn();

      const middleware = validateQueryParams([]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should use default empty array if no required parameters specified', () => {
      const req = { query: {} };
      const res = {};
      const next = jest.fn();

      const middleware = validateQueryParams();
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should handle falsy values (like 0 or empty string) as valid parameter values', () => {
      const req = { 
        query: { 
          number: '0', 
          emptyString: '',
          booleanValue: 'false'
        } 
      };
      const res = {};
      const next = jest.fn();

      const middleware = validateQueryParams(['number', 'emptyString', 'booleanValue']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Validation in test environment', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalTestValidation = process.env.TEST_VALIDATION;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      process.env.TEST_VALIDATION = originalTestValidation;
    });

    test('should skip validation in test environment without TEST_VALIDATION=true', () => {
      process.env.NODE_ENV = 'test';
      process.env.TEST_VALIDATION = undefined;

      const req = { body: {} }; // Missing required fields
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = validateRequestBody(['field1']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should run validation in test environment with TEST_VALIDATION=true', () => {
      process.env.NODE_ENV = 'test';
      process.env.TEST_VALIDATION = 'true';

      const req = { body: {} }; // Missing required fields
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = validateRequestBody(['field1']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Missing required fields')
      });
    });
  });
});
