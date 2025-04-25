// __tests__/app-routes.test.js
/**
 * Tests specifically for the route handlers in app.js
 */

// Mock dotenv before anything else
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock config to avoid requiring real config with dependencies
jest.mock('../config', () => ({
  apiKey: 'test-api-key',
  notifications: { enabled: false },
  environment: 'test',
  testMockTranslate: true // Add this to make translation service use mocks
}));

// Create mock Express app
const mockApp = {
  use: jest.fn().mockReturnThis(),
  get: jest.fn().mockReturnThis(),
  post: jest.fn().mockReturnThis()
};

// Mock Router without referencing the original
const mockRouter = {
  get: jest.fn().mockReturnThis(),
  post: jest.fn().mockReturnThis(),
  use: jest.fn().mockReturnThis()
};

// Mock express
jest.mock('express', () => {
  const mockExpress = jest.fn(() => mockApp);
  mockExpress.json = jest.fn(() => 'express-json-middleware');
  mockExpress.urlencoded = jest.fn(() => 'express-urlencoded-middleware');
  mockExpress.static = jest.fn(() => 'express-static-middleware');
  mockExpress.Router = jest.fn(() => mockRouter);
  return mockExpress;
});

// Mock other dependencies
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../utils/error-handler', () => ({
  handleError: jest.fn()
}));

jest.mock('../middleware/common', () => ({
  trackApiCall: jest.fn(),
  standardizeResponse: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/'))
}));

jest.mock('cors', () => jest.fn(() => 'mock-cors-middleware'));
jest.mock('helmet', () => jest.fn(() => 'mock-helmet-middleware'));
jest.mock('morgan', () => jest.fn(() => 'mock-morgan-middleware'));

// Mock modules that might cause issues
jest.mock('../modules/translation-service', () => ({
  translate: jest.fn().mockResolvedValue('translated-text'),
  detectLanguage: jest.fn().mockResolvedValue('en'),
  translateItems: jest.fn().mockResolvedValue([])
}));
jest.mock('../modules/invoice-processor', () => ({}));
jest.mock('../modules/invoice-service', () => ({}));

// Mock route modules
jest.mock('../routes/voice-routes', () => 'mock-voice-routes');
jest.mock('../routes/invoice-routes', () => 'mock-invoice-routes');
jest.mock('../routes/inventory-routes', () => 'mock-inventory-routes');
jest.mock('../routes/health', () => 'mock-health-routes');
jest.mock('../routes/i18n-routes', () => 'mock-i18n-routes');
jest.mock('../routes/auth-routes', () => 'mock-auth-routes');
jest.mock('../middleware/globalErrorHandler', () => 'mock-global-error-handler');

describe('App Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApp._routes = {};
    require('../app');
  });

  test('should register all routes and middleware', () => {
    // Verify middleware registration
    expect(mockApp.use).toHaveBeenCalledWith('mock-cors-middleware');
    expect(mockApp.use).toHaveBeenCalledWith('mock-helmet-middleware');
    expect(mockApp.use).toHaveBeenCalledWith('express-json-middleware');
    expect(mockApp.use).toHaveBeenCalledWith('express-urlencoded-middleware');
    
    // Verify routes were registered
    expect(mockApp.use).toHaveBeenCalledWith('/api/voice', 'mock-voice-routes');
    expect(mockApp.use).toHaveBeenCalledWith('/api/invoices', 'mock-invoice-routes');
    expect(mockApp.use).toHaveBeenCalledWith('/api/inventory', 'mock-inventory-routes');
    expect(mockApp.use).toHaveBeenCalledWith('/api/health', 'mock-health-routes');
    expect(mockApp.use).toHaveBeenCalledWith('/health', 'mock-health-routes');
    expect(mockApp.use).toHaveBeenCalledWith('/api/i18n', 'mock-i18n-routes');
    expect(mockApp.use).toHaveBeenCalledWith('/api/auth', 'mock-auth-routes');
  });
});