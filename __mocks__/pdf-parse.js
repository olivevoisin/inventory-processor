module.exports = jest.fn().mockImplementation((pdfBuffer) => {
  if (!pdfBuffer) {
    return Promise.reject(new Error('Invalid PDF buffer'));
  }
  
  if (pdfBuffer.toString().includes('error')) {
    return Promise.reject(new Error('PDF parsing error'));
  }
  
  return Promise.resolve({
    text: 'Sample PDF Text\nExtracted from mock PDF',
    numpages: 1,
    info: { Title: 'Test Document' }
  });
});
