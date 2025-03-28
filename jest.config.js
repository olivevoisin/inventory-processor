// jest.config.js
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Files to test
  testMatch: ['**/__tests__/**/*.test.js'],
  
  // Verbose output
  verbose: true,
  
  // Setup files
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  
  // Mock settings
  automock: false,
  
  // Module directories where Jest should look for modules
  moduleDirectories: ['node_modules', __dirname],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'modules/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/coverage/**'
  ]
};
