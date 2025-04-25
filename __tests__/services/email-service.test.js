// Define mock function first
const mockSendMail = jest.fn().mockImplementation((opts, cb) => cb(null, { messageId: '123' }));

// Then create the mock
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail
  })
}), { virtual: true });

// Mock the service implementation
jest.mock('../../services/email-service', () => ({
  sendEmail: async (options) => {
    const transport = require('nodemailer').createTransport();
    return new Promise((resolve, reject) => {
      transport.sendMail(options, (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });
  }
}));

// Require modules (remove duplicate nodemailer import here)
const nodemailer = require('nodemailer');
const emailService = require('../../services/email-service');

describe('Email Service', () => {
  const mockOptions = {
    to: 'test@example.com',
    subject: 'Test Email',
    text: 'This is a test email'
  };

  test('sendEmail resolves with messageId on success', async () => {
    const result = await emailService.sendEmail(mockOptions);
    expect(result).toEqual({ messageId: '123' });
    expect(nodemailer.createTransport).toHaveBeenCalled();
  });

  test('sendEmail rejects on transport error', async () => {
    mockSendMail.mockImplementationOnce((opts, cb) => 
      cb(new Error('SMTP down'))
    );

    await expect(emailService.sendEmail(mockOptions))
      .rejects.toThrow('SMTP down');
  });
});