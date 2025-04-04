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
<<<<<<< HEAD
  coveragePathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  testTimeout: 30000,
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  }
=======
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
>>>>>>> 886f868 (Push project copy to 28mars branch)
};
