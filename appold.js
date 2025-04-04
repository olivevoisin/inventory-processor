// app.js
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { createLogger } = require('./utils/logger');
const config = require('./config');

// Import core modules
const { processVoiceRecording } = require('./modules/voice-processor');
const { processInvoice, processInvoiceDirectory } = require('./modules/invoice-processor');

// Import routes
const voiceRoutes = require('./routes/voice-routes');
const invoiceRoutes = require('./routes/invoice-routes');

// Create Express app
const app = express();
const logger = createLogger('app');

// Initialize scheduler if enabled
if (config.invoiceProcessing && config.invoiceProcessing.schedulerEnabled) {
  try {
    const { scheduleInvoiceProcessingJob } = require('./scripts/invoice-scheduler');
    scheduleInvoiceProcessingJob(config.invoiceProcessing.schedule);
    logger.info('Invoice processing scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize invoice scheduler:', error);
  }
}

// Middleware
app.use(morgan('combined'));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create required directories
const dirs = [
  path.join(__dirname, 'uploads/audio'),
  path.join(__dirname, 'uploads/invoices'),
  path.join(__dirname, 'logs')
];

dirs.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  } catch (error) {
    logger.error(`Failed to create directory ${dir}:`, error);
  }
});

// Configure multer storage for Google Apps Script endpoints
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    
    if (file.fieldname === 'audioFile') {
      uploadDir = path.join(__dirname, 'uploads/audio');
    } else if (file.fieldname === 'invoiceFile') {
      uploadDir = path.join(__dirname, 'uploads/invoices');
    } else {
      uploadDir = path.join(__dirname, 'uploads');
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${file.fieldname}-${timestamp}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Regular API Routes
app.use('/api/voice', voiceRoutes);
app.use('/api/invoice', invoiceRoutes);

// ---------- Google Apps Script Specific Endpoints ----------

/**
 * @route POST /gas/process-voice
 * @description Process voice recording sent from Google Apps Script
 * @access Public (with API key)
 */
app.post('/gas/process-voice', upload.single('audioFile'), async (req, res) => {
  try {
    // Validate API key
    const apiKey = req.header('X-API-Key');
    if (!apiKey || apiKey !== process.env.GAS_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API key'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No audio file uploaded' 
      });
    }
    
    // Get confidence threshold from request or use default
    const confidenceThreshold = parseFloat(req.body.confidenceThreshold) || 0.85;
    
    // Process the uploaded recording
    const result = await processVoiceRecording(
      req.file.path,
      confidenceThreshold
    );
    
    logger.info('Voice recording processed successfully via GAS endpoint', {
      filename: req.file.originalname,
      matchedProducts: result.matchedProducts.length,
      lowConfidenceMatches: result.lowConfidenceMatches.length
    });
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error processing voice recording from GAS:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing voice recording',
      error: error.message
    });
  }
});

/**
 * @route POST /gas/process-invoice
 * @description Process invoice file sent from Google Apps Script
 * @access Public (with API key)
 */
app.post('/gas/process-invoice', upload.single('invoiceFile'), async (req, res) => {
  try {
    // Validate API key
    const apiKey = req.header('X-API-Key');
    if (!apiKey || apiKey !== process.env.GAS_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API key'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No invoice file uploaded' 
      });
    }
    
    // Process the uploaded invoice
    const result = await processInvoice(req.file.path);
    
    logger.info('Invoice processed successfully via GAS endpoint', {
      filename: req.file.originalname,
      productsExtracted: result.productsExtracted
    });
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error processing invoice from GAS:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing invoice',
      error: error.message
    });
  }
});

/**
 * @route POST /gas/process-invoice-directory
 * @description Process invoice directory, triggered from Google Apps Script
 * @access Public (with API key)
 */
app.post('/gas/process-invoice-directory', async (req, res) => {
  try {
    // Validate API key
    const apiKey = req.header('X-API-Key');
    if (!apiKey || apiKey !== process.env.GAS_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API key'
      });
    }
    
    const { directory } = req.body;
    
    // Use specified directory or default from config
    const invoiceDir = directory || config.invoiceProcessing.directory;
    
    // Process the directory
    const result = await processInvoiceDirectory(invoiceDir, true);
    
    logger.info('Invoice directory processed successfully via GAS endpoint', {
      directory: invoiceDir,
      processed: result.processed.length,
      failed: result.failed.length
    });
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error processing invoice directory from GAS:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing invoice directory',
      error: error.message
    });
  }
});

// Root endpoint for health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'inventory-processor',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : {
      stack: err.stack
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;