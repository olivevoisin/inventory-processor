// __tests__/helpers/db-test-utils.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let mongoServer;
let dbConnection;

/**
 * Set up an in-memory MongoDB server for testing
 * @returns {Promise<Object>} Database connection
 */
const setupTestDatabase = async () => {
  // Create new MongoDB in-memory server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Connect to in-memory database
  const client = new MongoClient(uri);
  await client.connect();
  dbConnection = client.db();
  
  // Return connection to use in tests
  return dbConnection;
};

/**
 * Close database connection and server
 * @returns {Promise<void>}
 */
const closeTestDatabase = async () => {
  if (dbConnection) {
    await dbConnection.client.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Reset all test collections
 * @param {Array} collectionNames - Collections to reset
 * @returns {Promise<void>}
 */
const resetCollections = async (collectionNames = []) => {
  if (!dbConnection) {
    throw new Error('Database connection not established. Call setupTestDatabase first.');
  }
  
  if (collectionNames.length === 0) {
    // If no collections specified, get all collections and reset them
    const collections = await dbConnection.listCollections().toArray();
    collectionNames = collections.map(c => c.name);
  }
  
  // Clear each collection
  for (const name of collectionNames) {
    await dbConnection.collection(name).deleteMany({});
  }
};

/**
 * Create indexes required for testing
 * @returns {Promise<void>}
 */
const createTestIndexes = async () => {
  if (!dbConnection) {
    throw new Error('Database connection not established. Call setupTestDatabase first.');
  }
  
  // Create any indexes needed for tests
  await dbConnection.collection('invoices').createIndex({ invoiceId: 1 }, { unique: true });
  await dbConnection.collection('voiceRecords').createIndex({ recordId: 1 }, { unique: true });
  await dbConnection.collection('translations').createIndex({ sourceId: 1, language: 1 });
};

/**
 * Insert test documents into a collection
 * @param {string} collectionName - Name of collection
 * @param {Array} documents - Documents to insert
 * @returns {Promise<Array>} Inserted documents with _id
 */
const insertTestDocuments = async (collectionName, documents) => {
  if (!dbConnection) {
    throw new Error('Database connection not established. Call setupTestDatabase first.');
  }
  
  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }
  
  const result = await dbConnection.collection(collectionName).insertMany(documents);
  
  // Return documents with their new _id values
  return documents.map((doc, index) => {
    const insertedId = Object.values(result.insertedIds)[index];
    return { ...doc, _id: insertedId };
  });
};

/**
 * Find documents in a collection
 * @param {string} collectionName - Collection name
 * @param {Object} query - MongoDB query
 * @returns {Promise<Array>} Found documents
 */
const findTestDocuments = async (collectionName, query = {}) => {
  if (!dbConnection) {
    throw new Error('Database connection not established. Call setupTestDatabase first.');
  }
  
  return dbConnection.collection(collectionName).find(query).toArray();
};

module.exports = {
  setupTestDatabase,
  closeTestDatabase,
  resetCollections,
  createTestIndexes,
  insertTestDocuments,
  findTestDocuments
};