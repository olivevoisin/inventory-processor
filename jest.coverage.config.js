// jest.coverage.config.js
module.exports = {
    ...require('./jest.config'),
    collectCoverage: true,
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85
      }
    }
  };