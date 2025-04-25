/**
 * Unit tests for notification.js utility
 */

// Mock dependencies before importing the module
const mockSendEmail = jest.fn().mockResolvedValue({ success: true, messageId: 'test-123' });
const mockSendSms = jest.fn().mockResolvedValue({ success: true, sid: 'SM123' });

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock axios for API calls
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  get: jest.fn().mockResolvedValue({ data: { success: true } })
}));

// Mock config
jest.mock('../../config', () => ({
  notifications: {
    enabled: true,
    email: {
      enabled: true,
      from: 'test@example.com',
      adminEmail: 'admin@example.com'
    },
    sms: {
      enabled: true,
      from: '+1234567890',
      adminPhone: '+0987654321'
    },
    slack: {
      enabled: true,
      webhookUrl: 'https://hooks.slack.com/test',
      channel: '#test-channel'
    }
  }
}));

// Using jest.doMock instead of jest.mock to avoid the module resolution error
// This approach works even if the module doesn't exist physically
jest.doMock('../../services/email-service', () => ({
  sendEmail: mockSendEmail
}));

jest.doMock('../../services/sms-service', () => ({
  sendSms: mockSendSms
}));

// Mock logger
jest.mock('../../utils/logger', () => mockLogger);

// Now import the module under test
const notification = require('../../utils/notification');
const axios = require('axios');

describe('Notification Utility', () => {
  // Track any pending promises for cleanup
  let pendingPromises = [];
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear pending promises array
    pendingPromises = [];
  });
  
  // Helper to track promises for cleanup
  const trackPromise = (promise) => {
    pendingPromises.push(promise);
    return promise;
  };
  
  // Clean up after all tests
  afterAll(async () => {
    // Wait for any pending promises to resolve/reject
    await Promise.allSettled(pendingPromises);
    // Ensure timers are cleared
    jest.useRealTimers();
  });

  describe('notifyAdmin', () => {
    test('should send admin notification via email', async () => {
      const message = 'Test notification message';
      const resultPromise = notification.notifyAdmin(message);
      const result = await trackPromise(resultPromise);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: expect.stringContaining('Admin Notification'),
          text: expect.stringContaining(message)
        })
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('should handle errors when sending admin notification', async () => {
      // Make both email and SMS fail
      mockSendEmail.mockRejectedValueOnce(new Error('Email error'));
      mockSendSms.mockRejectedValueOnce(new Error('SMS error'));
      
      const message = 'Test notification message';
      const resultPromise = notification.notifyAdmin(message);
      const result = await trackPromise(resultPromise);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    test('should send notification via SMS if email fails', async () => {
      // Make email fail first
      mockSendEmail.mockRejectedValueOnce(new Error('Email error'));
      
      const message = 'Test notification message';
      const resultPromise = notification.notifyAdmin(message);
      const result = await trackPromise(resultPromise);
      
      // Check that SMS was attempted as fallback
      expect(mockSendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+0987654321',
          body: expect.stringContaining(message)
        })
      );
    });
  });

  describe('sendSlackNotification', () => {
    test('should send notification to Slack', async () => {
      const message = 'Test Slack message';
      const resultPromise = notification.sendSlackNotification(message);
      const result = await trackPromise(resultPromise);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          text: message
        })
      );
    });

    test('should handle errors when sending Slack notification', async () => {
      axios.post.mockRejectedValueOnce(new Error('Slack API error'));
      
      const message = 'Test Slack message';
      const resultPromise = notification.sendSlackNotification(message);
      const result = await trackPromise(resultPromise);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
  
  describe('notify', () => {
    test('should send notification via all channels when all enabled', async () => {
      const message = 'Test multichannel message';
      const resultPromise = notification.notify(message);
      const result = await trackPromise(resultPromise);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockSendSms).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalled(); // Slack notification
    });
    
    test('should send notification to specified channel only', async () => {
      const message = 'Test specific channel message';
      const resultPromise = notification.notify(message, { channel: 'email' });
      const result = await trackPromise(resultPromise);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockSendSms).not.toHaveBeenCalled();
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});
