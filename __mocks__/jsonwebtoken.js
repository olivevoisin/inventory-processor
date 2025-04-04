/**
 * Mock pour le module jsonwebtoken
 */
module.exports = {
  sign: jest.fn().mockImplementation((payload, secret, options) => {
    return `mock_jwt_token_${JSON.stringify(payload)}`;
  }),
  
  verify: jest.fn().mockImplementation((token, secret) => {
    if (token === 'invalid_token') {
      throw new Error('Invalid token');
    }
    
    // Parse the mock token format
    const payloadStr = token.replace('mock_jwt_token_', '');
    return JSON.parse(payloadStr);
  })
};
