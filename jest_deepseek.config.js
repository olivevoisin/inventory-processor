// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'modules/**/*.js',
    'utils/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['./__tests__/setup.js'], // Update this path
  testTimeout: 10000
};
