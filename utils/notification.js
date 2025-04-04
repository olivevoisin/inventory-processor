// Minimal implementation for testing
module.exports = {
  sendEmail: async () => ({ success: true }),
  sendSms: async () => ({ success: true }),
  sendSlackMessage: async () => ({ success: true }),
  notifyAdmin: async () => ({ success: true }),
  notifyError: async () => ({ success: true })
};
