// __tests__/mocks/tesseract.js
const mockTesseract = {
    createWorker: jest.fn().mockImplementation(() => {
      return {
        load: jest.fn().mockResolvedValue({}),
        loadLanguage: jest.fn().mockResolvedValue({}),
        initialize: jest.fn().mockResolvedValue({}),
        setParameters: jest.fn().mockResolvedValue({}),
        recognize: jest.fn().mockResolvedValue({
          data: {
            text: 'Sample Invoice\nVendor: Test Company\nInvoice #: INV-12345\nAmount: $100.00\nDate: 2025-03-19',
            confidence: 95,
            lines: [
              { text: 'Sample Invoice', confidence: 98 },
              { text: 'Vendor: Test Company', confidence: 96 },
              { text: 'Invoice #: INV-12345', confidence: 97 },
              { text: 'Amount: $100.00', confidence: 95 },
              { text: 'Date: 2025-03-19', confidence: 94 }
            ]
          }
        }),
        terminate: jest.fn().mockResolvedValue({})
      };
    })
  };
  
  module.exports = mockTesseract;