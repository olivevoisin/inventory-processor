module.exports = {
  // ...existing config...
  moduleNameMapper: {
    '^../config$': '<rootDir>/__mocks__/config.js', // Map '../config' to the mock file
  },
};
