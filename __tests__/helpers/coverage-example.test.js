const { ValidationError } = require('../utils/error-handler');

describe('Error Handler Direct Test', () => {
  test('ValidationError should have correct properties', () => {
    const error = new ValidationError('Test validation error');
    
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test validation error');
    expect(error.statusCode).toBe(400);
  });
});
