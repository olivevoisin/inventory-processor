/**
 * Unit tests for authentication middleware
 */
const { authenticateApiKey, authenticateUser, authorizeAdmin } = require('../../middleware/auth'); // Changed from ../../../middleware/auth
const config = require('../../config'); // Changed from ../../../config

// Mock the logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

// Mock the config
jest.mock('../../config', () => ({
  apiKey: 'test-api-key', // Ensure apiKey is defined here
  auth: {
    apiKey: 'test-api-key',
    enabled: true
  }
}), { virtual: true });

describe('Authentication Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Reset mock objects before each test
    req = {
      headers: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    // Save original environment
    process.env.originalSkipAuth = process.env.SKIP_AUTH;
    process.env.originalNodeEnv = process.env.NODE_ENV;
    
    // Default to not skipping auth in tests
    delete process.env.SKIP_AUTH;
  });
  
  afterEach(() => {
    // Restore original environment
    process.env.SKIP_AUTH = process.env.originalSkipAuth;
    process.env.NODE_ENV = process.env.originalNodeEnv;
    
    delete process.env.originalSkipAuth;
    delete process.env.originalNodeEnv;
  });

  describe('authenticateApiKey', () => {
    test('allows request with valid API key in header', () => {
      req.headers['x-api-key'] = config.apiKey;
      
      authenticateApiKey(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('allows request with valid API key in query', () => {
      req.query.apiKey = config.apiKey;
      
      authenticateApiKey(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('allows request when SKIP_AUTH is true', () => {
      process.env.SKIP_AUTH = 'true';
      
      authenticateApiKey(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('allows request with x-skip-auth header', () => {
      req.headers['x-skip-auth'] = 'true';
      
      authenticateApiKey(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('rejects invalid API key', () => {
      req.headers['x-api-key'] = 'invalid-key';
      
      authenticateApiKey(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });
    
    test('handles missing API key', () => {
      authenticateApiKey(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'API key is required'
      }));
    });
  });

  describe('authenticateUser', () => {
    test('allows request with authenticated user session', () => {
      req.session = { user: { id: '123', name: 'Test User' } };
      
      authenticateUser(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('allows request in test mode', () => {
      process.env.NODE_ENV = 'test';
      
      authenticateUser(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('rejects unauthenticated request', () => {
      process.env.NODE_ENV = 'production';
      req.session = {};
      
      authenticateUser(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
    
    test('handles missing session', () => {
      process.env.NODE_ENV = 'production';
      
      authenticateUser(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('authorizeAdmin', () => {
    test('allows request for admin user', () => {
      process.env.NODE_ENV = 'production';
      req.session = { user: { id: '123', role: 'admin' } };
      
      authorizeAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('allows request in test mode', () => {
      process.env.NODE_ENV = 'test';
      
      authorizeAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('rejects non-admin user', () => {
      process.env.NODE_ENV = 'production';
      req.session = { user: { id: '123', role: 'user' } };
      
      authorizeAdmin(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
    
    test('rejects unauthenticated request', () => {
      process.env.NODE_ENV = 'production';
      req.session = {};
      
      authorizeAdmin(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
