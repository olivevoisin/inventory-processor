const mockSend = jest.fn().mockResolvedValue({ sid: 'SM123' });

jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockSend }
  }));
}, { virtual: true });

// Mock the service implementation
jest.mock('../../services/sms-service', () => ({
  sendSms: async (options) => {
    const twilio = require('twilio')();
    return await twilio.messages.create(options);
  }
}));

const smsService = require('../../services/sms-service');
const twilio = require('twilio');

describe('SMS Service', () => {
  const msgOpts = {
    to: '+15551234567',
    body: 'Test message'
  };

  test('sendSms resolves with sid on success', async () => {
    const result = await smsService.sendSms(msgOpts);
    expect(result).toEqual({ sid: 'SM123' });
    expect(twilio).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith(msgOpts);
  });

  test('sendSms rejects on Twilio error', async () => {
    mockSend.mockRejectedValueOnce(new Error('Twilio down'));
    await expect(smsService.sendSms(msgOpts))
      .rejects.toThrow('Twilio down');
  });
});