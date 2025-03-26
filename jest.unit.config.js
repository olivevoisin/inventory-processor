const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testMatch: ['**/__tests__/unit/**/*.test.js'],
  collectCoverage: true
};
