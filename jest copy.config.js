// jest.config.js
module.exports = {
  // Basic settings
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  
  // Timeout settings (increase if needed for slower tests)
  testTimeout: 30000,
  
  // Setup and teardown files
  setupFilesAfterEnv: ['./__tests__/helpers/jest.setup.js'],
  
  // Mock paths - automatically mock certain modules
  automock: false,
  
  // Module name mapper for handling dependencies
  moduleNameMapper: {
    '^app$': '<rootDir>/__tests__/mocks/app.js'
  },
  
  // Configure mocking behavior
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  
  // Set up coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'html', 'json-summary'],
  collectCoverageFrom: [
    'modules/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**'
  ],
  
  // More lenient coverage thresholds during development
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};