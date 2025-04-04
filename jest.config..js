module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  testTimeout: 30000,
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  }
};
