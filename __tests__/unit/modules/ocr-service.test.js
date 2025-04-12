/**
 * Unit tests for OCR Service module
 */

// Create a manual mock for logger to have more control
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock dependencies first before requiring module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock pdf content'))
  }
}));

// Mock the logger explicitly
jest.mock('../../../utils/logger', () => mockLogger);

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((pdfBuffer) => {
    if (!pdfBuffer) {
      return Promise.reject(new Error('Invalid PDF buffer'));
    }
    
    if (Buffer.isBuffer(pdfBuffer) && pdfBuffer.toString().includes('error')) {
      return Promise.reject(new Error('PDF parsing error'));
    }
    
    return Promise.resolve({
      text: 'Sample PDF Text\nExtracted from mock PDF',
      numpages: 1,
      info: { Title: 'Test Document' }
    });
  });
});

// Mock tesseract.js
jest.mock('tesseract.js', () => {
  return {
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
});

// Import module AFTER mocking dependencies
const fs = require('fs').promises;
const ocrService = require('../../../modules/ocr-service');

describe('OCR Service Module', () => {
  beforeEach(() => {
    // Clear all mock function calls before each test
    jest.clearAllMocks();
  });

  describe('extractTextFromPdf', () => {
    test('should extract text from PDF buffer', async () => {
      const pdfBuffer = Buffer.from('mock pdf content');
      const result = await ocrService.extractTextFromPdf(pdfBuffer);
      
      expect(result).toContain('Sample PDF Text');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Extracting text from PDF'));
    });
    
    test('should extract text from PDF file path', async () => {
      const result = await ocrService.extractTextFromPdf('path/to/invoice.pdf');
      
      expect(result).toContain('Sample PDF Text');
      expect(fs.readFile).toHaveBeenCalledWith('path/to/invoice.pdf');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Extracting text from PDF'));
    });

    describe('error handling', () => {
      test('should handle null input', async () => {
        jest.clearAllMocks(); // Ensure mock is clean before test
        await expect(ocrService.extractTextFromPdf(null)).rejects.toThrow('Invalid PDF input');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid PDF input'));
      });
      
      test('should handle undefined input', async () => {
        jest.clearAllMocks(); // Ensure mock is clean before test
        await expect(ocrService.extractTextFromPdf(undefined)).rejects.toThrow('Invalid PDF input');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid PDF input'));
      });
      
      test('should handle PDF parsing errors', async () => {
        jest.clearAllMocks(); // Ensure mock is clean before test
        const errorBuffer = Buffer.from('error content');
        await expect(ocrService.extractTextFromPdf(errorBuffer)).rejects.toThrow('PDF parsing error');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error extracting text from PDF'));
      });
      
      test('should handle file reading errors', async () => {
        jest.clearAllMocks(); // Ensure mock is clean before test
        fs.readFile.mockRejectedValueOnce(new Error('File not found'));
        
        await expect(ocrService.extractTextFromPdf('nonexistent.pdf')).rejects.toThrow('File not found');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error extracting text from PDF'));
      });
    });
  });

  describe('extractTextFromImage', () => {
    test('should extract text from image buffer', async () => {
      const imageBuffer = Buffer.from('mock image content');
      const result = await ocrService.extractTextFromImage(imageBuffer);
      
      expect(result).toContain('Sample OCR Text');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Extracting text from image'));
    });
    
    test('should extract text from image file path', async () => {
      const result = await ocrService.extractTextFromImage('path/to/invoice.jpg');
      
      expect(result).toContain('Sample OCR Text');
      expect(fs.readFile).toHaveBeenCalledWith('path/to/invoice.jpg');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Extracting text from image'));
    });

    describe('error handling', () => {
      test('should handle null input', async () => {
        jest.clearAllMocks(); // Ensure mock is clean before test
        await expect(ocrService.extractTextFromImage(null)).rejects.toThrow('Invalid image input');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid image input'));
      });

      test('should handle undefined input', async () => {
        jest.clearAllMocks(); // Ensure mock is clean before test
        await expect(ocrService.extractTextFromImage(undefined)).rejects.toThrow('Invalid image input');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid image input'));
      });

      test('should handle Tesseract errors', async () => {
        jest.clearAllMocks(); // Ensure mock is clean before test
        require('tesseract.js').createWorker.mockImplementationOnce(() => {
          return ({
            load: jest.fn().mockResolvedValue({}),
            loadLanguage: jest.fn().mockResolvedValue({}),
            initialize: jest.fn().mockResolvedValue({}),
            recognize: jest.fn().mockRejectedValue(new Error('OCR processing error')),
            terminate: jest.fn().mockResolvedValue({})
          });
        });
        
        await expect(ocrService.extractTextFromImage('test.jpg')).rejects.toThrow('OCR processing error');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error extracting text from image'));
      });

      test('should handle file reading errors', async () => {
        jest.clearAllMocks(); // Ensure mock is clean before test
        fs.readFile.mockRejectedValueOnce(new Error('File not found'));
        
        await expect(ocrService.extractTextFromImage('nonexistent.jpg')).rejects.toThrow('File not found');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error extracting text from image'));
      });
    });
  });

  describe('cleanup', () => {
    test('should clean up extracted text', () => {
      const dirtyText = '  This is a test\n\n   with extra spaces  \nand newlines\n\n';
      const cleanText = ocrService.cleanup(dirtyText);
      
      expect(cleanText).toBe('This is a test with extra spaces and newlines');
    });
    
    test('should handle null or undefined input', () => {
      expect(ocrService.cleanup(null)).toBe('');
      expect(ocrService.cleanup(undefined)).toBe('');
      expect(ocrService.cleanup('')).toBe('');
    });
  });
});
