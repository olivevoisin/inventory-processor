// __tests__/helpers/api-test-utils.js
const request = require('supertest');
const app = require('../../app');

/**
 * Perform authenticated API request
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} authUser - User to authenticate as
 * @returns {Promise} Supertest request
 */
const authenticatedRequest = async (method, endpoint, data = null, authUser = null) => {
  // Mock authentication system
  // This implementation will vary based on your auth system
  const token = authUser ? `mock-token-for-${authUser.id}` : null;
  
  let req = request(app)[method.toLowerCase()](endpoint);
  
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    req = req.send(data);
  }
  
  return req;
};

/**
 * Create a file upload request
 * @param {string} endpoint - API endpoint
 * @param {string} filePath - Path to file
 * @param {string} fieldName - Form field name
 * @param {Object} additionalFields - Additional form fields
 * @returns {Promise} Supertest request
 */
const fileUploadRequest = (endpoint, filePath, fieldName = 'file', additionalFields = {}) => {
  let req = request(app)
    .post(endpoint)
    .attach(fieldName, filePath);
    
  // Add any additional form fields
  Object.entries(additionalFields).forEach(([key, value]) => {
    req = req.field(key, value);
  });
  
  return req;
};

/**
 * Test helper for API pagination
 * @param {string} endpoint - Base API endpoint
 * @param {Object} options - Pagination options
 * @returns {Promise} Response from paginated request
 */
const testPagination = async (endpoint, options = {}) => {
  const { 
    page = 1, 
    limit = 10, 
    sortField = 'createdAt', 
    sortOrder = 'desc',
    filters = {} 
  } = options;
  
  // Convert filters to query string
  const filterParams = Object.entries(filters)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  const queryString = `page=${page}&limit=${limit}&sortField=${sortField}&sortOrder=${sortOrder}${filterParams ? `&${filterParams}` : ''}`;
  
  return request(app)
    .get(`${endpoint}?${queryString}`)
    .expect(200);
};

/**
 * Validate common API response structure
 * @param {Object} response - API response
 * @param {Object} options - Validation options
 */
const validateApiResponse = (response, options = {}) => {
  const {
    expectSuccess = true,
    expectedDataType = 'object'
  } = options;
  
  // Check basic response structure
  expect(response.body).toHaveProperty('success');
  expect(response.body.success).toBe(expectSuccess);
  
  if (expectSuccess) {
    expect(response.body).toHaveProperty('data');
    
    if (expectedDataType === 'array') {
      expect(Array.isArray(response.body.data)).toBe(true);
    } else if (expectedDataType === 'object') {
      expect(typeof response.body.data).toBe('object');
      expect(response.body.data).not.toBeNull();
    }
  } else {
    expect(response.body).toHaveProperty('error');
    expect(typeof response.body.error).toBe('string');
  }
};

module.exports = {
  authenticatedRequest,
  fileUploadRequest,
  testPagination,
  validateApiResponse
};