/**
 * Shared mocks for invoice-processor dependencies
 */

// Mock fs
const mockFs = {
  promises: {
    readFile: jest.fn().mockImplementation((filePath) => {
      return Promise.resolve(Buffer.from('mock file content'));
    })
  }
};

// Mock OCR service
const mockOcrService = {
  extractTextFromPdf: jest.fn().mockResolvedValue('Invoice #12345\nDate: 2023-10-15\nItems:\nWine - 5 bottles - $100\nBeer - 10 cans - $50'),
  extractTextFromImage: jest.fn().mockResolvedValue('Invoice #12345\nDate: 2023-10-15\nItems:\nWine - 5 bottles - $100\nBeer - 10 cans - $50'),
  cleanup: jest.fn().mockImplementation(text => text ? text.trim() : '')
};

// Mock translation service
const mockTranslationService = {
  detectLanguage: jest.fn().mockReturnValue('en'),
  translate: jest.fn().mockImplementation(text => Promise.resolve(text))
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

module.exports = {
  mockFs,
  mockOcrService,
  mockTranslationService,
  mockLogger
};
