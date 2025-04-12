const { ValidationError } = require('../utils/error-handler');

describe('Error Handler Direct Test', () => {
  test('ValidationError should have correct properties', () => {
    // Create a ValidationError instance
    const error = new ValidationError('Test validation error');
    
    // Test the properties
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test validation error');
    expect(error.status).toBe(400); // Changed from statusCode to status to match implementation
  });
});
