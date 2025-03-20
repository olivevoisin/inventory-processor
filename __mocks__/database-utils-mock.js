// __tests__/mocks/database-utils-mock.js
const mockDatabaseUtils = {
    initialize: jest.fn().mockResolvedValue(undefined),
    getInventoryItems: jest.fn().mockResolvedValue([]),
    updateInventory: jest.fn().mockResolvedValue({}),
    createBackup: jest.fn().mockResolvedValue(undefined)
    // Add any other methods you need to mock
  };
  
  module.exports = mockDatabaseUtils;