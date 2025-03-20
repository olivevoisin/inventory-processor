module.exports = {
    ...require('./jest.config'),
    testMatch: ['**/__tests__/integration/**/*.test.js'],
    testTimeout: 30000
  };
