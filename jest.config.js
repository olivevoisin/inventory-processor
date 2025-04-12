<<<<<<< HEAD
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
=======
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/__mocks__/'
  ],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": 
      "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js"
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/', '/.history/'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  }
>>>>>>> backup-main
};
