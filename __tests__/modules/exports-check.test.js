const voiceProcessor = require('../../modules/voice-processor');
const invoiceProcessor = require('../../modules/invoice-processor');
const databaseUtils = require('../../utils/database-utils');

describe('Module Exports Check', () => {
  test('Voice processor exports', () => {
    expect(voiceProcessor).toBeDefined();
    // Just check if properties exist, don't call them
    expect(voiceProcessor).toHaveProperty('processVoiceFile');
    expect(voiceProcessor).toHaveProperty('extractInventoryData');
  });
  
  test('Invoice processor exports', () => {
    expect(invoiceProcessor).toBeDefined();
    expect(invoiceProcessor).toHaveProperty('processInvoice');
    expect(invoiceProcessor).toHaveProperty('extractInvoiceData');
  });
  
  test('Database utils exports', () => {
    expect(databaseUtils).toBeDefined();
    expect(databaseUtils).toHaveProperty('findProductByName');
    expect(databaseUtils).toHaveProperty('saveInventoryItems');
    expect(databaseUtils).toHaveProperty('saveInvoice');
  });
});
