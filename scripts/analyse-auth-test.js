/**
 * Script to analyze an auth test and reveal its details
 */

// Override require to add instrumentation
const originalRequire = require;
require = function(modulePath) {
  const result = originalRequire(modulePath);
  
  if (modulePath === '../middleware/auth') {
    console.log('Auth module imported');
    
    // Wrap the authenticateApiKey function
    const originalAuthenticateApiKey = result.authenticateApiKey;
    result.authenticateApiKey = function(req, res, next) {
      console.log('Auth middleware called with:');
      console.log('- Headers:', req.headers);
      console.log('- Environment:', process.env.NODE_ENV);
      
      // Call the original function and capture the result
      const originalResult = originalAuthenticateApiKey(req, res, next);
      
      // Check if next was called
      console.log('- next function called:', next.mock.calls.length > 0);
      
      return originalResult;
    };
  }
  
  return result;
};

// Mock objects
const req = {
  headers: {
    'x-api-key': 'invalid-key'
  }
};

const res = {
  status: jest.fn(() => res),
  json: jest.fn()
};

const next = jest.fn();

// Get the middleware function
const { authenticateApiKey } = require('../middleware/auth');

// Call the middleware with invalid key
authenticateApiKey(req, res, next);

// Check results
console.log('\nTest results:');
console.log('- next called:', next.mock.calls.length > 0);
console.log('- status called with:', res.status.mock.calls[0]?.[0]);
console.log('- json called:', res.json.mock.calls.length > 0);

// Reset the require implementation
require = originalRequire;
