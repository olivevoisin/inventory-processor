module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/__tests__/mocks/',
  ],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": 
      "<rootDir>//__test__/mocks/fileMock.js",
    "\\.(css|less)$": "<rootDir>/__test__/mocks/styleMock.js"
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/', '/.history/'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  }
};
