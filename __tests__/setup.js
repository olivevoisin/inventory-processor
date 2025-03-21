// __tests__/setup.js
const fs = require('fs');
const path = require('path');

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.GOOGLE_SHEETS_API_KEY = 'test-api-key';
process.env.DEEPGRAM_API_KEY = 'test-deepgram-api-key';

// Ensure all required directories exist
const directoriesToCreate = [
  path.join(__dirname, '__fixtures__'),
  path.join(__dirname, 'integration'),
  path.join(__dirname, 'integration/end-to-end'),
  path.join(__dirname, 'integration/workflows'),
  path.join(__dirname, 'unit')
];

directoriesToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create test fixture files if they don't exist
const fixturesDir = path.join(__dirname, '__fixtures__');

// Create a mock voice recording file
const voiceFilePath = path.join(fixturesDir, 'test-voice.mp3');
if (!fs.existsSync(voiceFilePath)) {
  fs.writeFileSync(voiceFilePath, 'MOCK_AUDIO_DATA');
}

// Create a mock invoice PDF
const invoiceFilePath = path.join(fixturesDir, 'test-invoice.pdf');
if (!fs.existsSync(invoiceFilePath)) {
  fs.writeFileSync(invoiceFilePath, 'MOCK_PDF_DATA');
}

// Create invoices directory
const invoicesDir = path.join(fixturesDir, 'invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

// Create processed directory
const processedDir = path.join(fixturesDir, 'processed');
if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}
