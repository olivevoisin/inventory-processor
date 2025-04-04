const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testMatch: ['**/__tests__/integration/**/*.test.js'],
  testTimeout: 30000
};
