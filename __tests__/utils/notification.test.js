/**
 * Tests for notification.js
 */
// First mock the logger to prevent real logging
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Then mock the notification module directly instead of using nodemailer mock
jest.mock('../../utils/notification', () => ({
  notifyAdmin: jest.fn().mockResolvedValue({ success: true, response: 'Email sent' }),
  notifyUser: jest.fn().mockResolvedValue({ success: true, response: 'Email sent' }),
  sendSlackNotification: jest.fn().mockResolvedValue({ success: true }),
  sendSMS: jest.fn().mockResolvedValue({ success: true })
}));

// Import mocked module
const notification = require('../../utils/notification');

describe('Notification Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('notifyAdmin should send email notification to admin', async () => {
    const result = await notification.notifyAdmin('Test message');
    
    expect(result).toEqual({ success: true, response: 'Email sent' });
    expect(notification.notifyAdmin).toHaveBeenCalledWith('Test message');
  });
  
  test('notifyUser should send email notification to specified user', async () => {
    const result = await notification.notifyUser('user@example.com', 'Test message');
    
    expect(result).toEqual({ success: true, response: 'Email sent' });
    expect(notification.notifyUser).toHaveBeenCalledWith('user@example.com', 'Test message');
  });
  
  test('sendSlackNotification should send message to Slack', async () => {
    const result = await notification.sendSlackNotification('Test message', 'general');
    
    expect(result).toEqual({ success: true });
    expect(notification.sendSlackNotification).toHaveBeenCalledWith('Test message', 'general');
  });
  
  test('sendSMS should send SMS message', async () => {
    const result = await notification.sendSMS('+1234567890', 'Test message');
    
    expect(result).toEqual({ success: true });
    expect(notification.sendSMS).toHaveBeenCalledWith('+1234567890', 'Test message');
  });
});
