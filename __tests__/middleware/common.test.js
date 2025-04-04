const commonMiddleware = require('../../middleware/common'); // Ensure this path is correct

describe('Common Middleware', () => {
  test('module loads correctly', () => {
    expect(commonMiddleware).toBeDefined();
    expect(commonMiddleware.trackApiCall).toBeDefined();
    expect(commonMiddleware.validateRequest).toBeDefined();
    expect(commonMiddleware.standardizeResponse).toBeDefined();
    expect(commonMiddleware.setupMiddleware).toBeDefined();
  });
  
  test('setupMiddleware adds standard middleware to app', () => {
    // Create a mock Express app
    const app = {
      use: jest.fn()
    };
    
    // Call the setupMiddleware function
    commonMiddleware.setupMiddleware(app);
    
    // Verify that app.use was called with each middleware
    expect(app.use).toHaveBeenCalled();
    
    // The specific number of calls depends on the implementation,
    // but it should be called at least once
    expect(app.use.mock.calls.length).toBeGreaterThan(0);
  });
});
