module.exports = {
  createWorker: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue({}),
    loadLanguage: jest.fn().mockResolvedValue({}),
    initialize: jest.fn().mockResolvedValue({}),
    recognize: jest.fn().mockResolvedValue({
      data: {
        text: 'Sample OCR Text\nExtracted from image'
      }
    }),
    terminate: jest.fn().mockResolvedValue({})
  }))
};
