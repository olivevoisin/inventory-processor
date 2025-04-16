/**
 * OCR Service Module
 * Handles text extraction from PDFs and images
 */
const fs = require('fs').promises;
const pdfParse = require('pdf-parse'); // Corrected: Require the actual module
const { createWorker } = require('tesseract.js'); // Corrected: Require the actual module
const logger = require('../utils/logger');

/**
 * Extract text from a PDF file or buffer
 * @param {string|Buffer} input - PDF file path or buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPdf(input) {
  try {
    logger.info(`Extracting text from PDF`);
    
    // Validate input
    if (!input) {
      const error = new Error('Invalid PDF input');
      logger.error(`Invalid PDF input provided: ${input}`);
      throw error;
    }
    
    // Handle both file paths and buffers
    let pdfBuffer;
    if (Buffer.isBuffer(input)) {
      pdfBuffer = input;
    } else {
      pdfBuffer = await fs.readFile(input);
    }
    
    // Extract text from PDF
    const { text } = await pdfParse(pdfBuffer);
    
    // Clean up the extracted text
    return cleanup(text);
  } catch (error) {
    logger.error(`Error extracting text from PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Extract text from an image file or buffer using OCR
 * @param {string|Buffer} input - Image file path or buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromImage(input) {
  try {
    logger.info(`Extracting text from image`);
    
    // Validate input
    if (!input) {
      const error = new Error('Invalid image input');
      logger.error(`Invalid image input provided: ${input}`);
      throw error;
    }
    
    // Handle both file paths and buffers
    let imageBuffer;
    if (Buffer.isBuffer(input)) {
      imageBuffer = input;
    } else {
      imageBuffer = await fs.readFile(input);
    }
    
    // Initialize Tesseract worker
    const worker = await createWorker();
    await worker.load();
    await worker.loadLanguage('eng+jpn+fra');
    await worker.initialize('eng+jpn+fra');
    
    // Perform OCR
    const { data } = await worker.recognize(imageBuffer);
    
    // Terminate worker
    await worker.terminate();
    
    // Clean up the extracted text
    return cleanup(data.text);
  } catch (error) {
    logger.error(`Error extracting text from image: ${error.message}`);
    throw error;
  }
}

/**
 * Clean up extracted text
 * @param {string} text - Raw extracted text
 * @returns {string} Cleaned text
 */
function cleanup(text) {
  if (!text) return '';
  
  // Normalize whitespace
  return text
    .replace(/\s+/g, ' ')   // Replace multiple whitespaces with a single space
    .replace(/\n+/g, ' ')   // Replace newlines with spaces
    .trim();                // Remove leading/trailing whitespace
}

module.exports = {
  extractTextFromPdf,
  extractTextFromImage,
  cleanup
};
