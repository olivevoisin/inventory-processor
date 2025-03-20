// __tests__/helpers/test-utils.js
const fs = require('fs');
const path = require('path');

/**
 * Load a test fixture from the fixtures directory
 * @param {string} fixturePath - Path relative to fixtures directory
 * @returns {Object} Parsed JSON fixture
 */
const loadFixture = (fixturePath) => {
  const fullPath = path.join(__dirname, '../fixtures/', fixturePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
};

/**
 * Create a mock Express response object
 * @returns {Object} Mock response with common Express methods
 */
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create a mock Express request object
 * @param {Object} options - Request options
 * @returns {Object} Mock request
 */
const createMockRequest = (options = {}) => {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    ...options
  };
};

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after timeout
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate random test data
 * @param {string} type - Type of data to generate
 * @returns {*} Random data of specified type
 */
const generateTestData = (type) => {
  switch (type) {
    case 'invoiceId':
      return `INV-${Math.floor(Math.random() * 1000000)}`;
    case 'timestamp':
      return new Date().toISOString();
    case 'userId':
      return `USER-${Math.floor(Math.random() * 1000000)}`;
    default:
      return `test-data-${Math.random()}`;
  }
};

/**
 * Clear all items from a collection in the test database
 * @param {Object} db - Database connection
 * @param {string} collectionName - Name of collection to clear
 */
const clearCollection = async (db, collectionName) => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Cannot clear collection outside of test environment');
  }
  
  await db.collection(collectionName).deleteMany({});
};

/**
 * Seed a collection with test data
 * @param {Object} db - Database connection
 * @param {string} collectionName - Name of collection
 * @param {Array} data - Array of documents to insert
 */
const seedCollection = async (db, collectionName, data) => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Cannot seed collection outside of test environment');
  }
  
  if (data.length > 0) {
    await db.collection(collectionName).insertMany(data);
  }
};

module.exports = {
  loadFixture,
  createMockResponse,
  createMockRequest,
  sleep,
  generateTestData,
  clearCollection,
  seedCollection
};