// routes/invoice-routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const invoiceProcessor = require('../modules/invoice-processor');
const invoiceService = require('../modules/invoice-service');
const monitoring = require('../utils/monitoring');
const { asyncHandler, ValidationError } = require('../utils/error-handler');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/invoices';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Get file extension
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    // Accept only configured file types
    if (invoiceService.allowedFileTypes.includes('.' + ext)) {
      cb(null, true);
    } else {
      cb(new ValidationError(
        `Unsupported file type: ${ext}. Supported types: ${invoiceService.allowedFileTypes.join(', ')}`,
        ['file'],
        'INVALID_FILE_TYPE'
      ));
    }
  }
});

/**
 * Process invoice file
 * @route POST /api/invoices/process
 */
router.post('/process', upload.single('invoice'), asyncHandler(async (req, res) => {
  // Track API call
  monitoring.trackApiCall('/api/invoices/process', 'POST');
  const timer = logger.startTimer();
  
  logger.info('Invoice processing request received', {
    module: 'invoice-routes',
    requestId: req.requestId,
    fileName: req.file ? req.file.originalname : null
  });
  
  // Validate file was uploaded
  if (!req.file) {
    throw new ValidationError('No invoice file provided', ['invoice'], 'MISSING_FILE');
  }
  
  // Track processing job start
  monitoring.trackProcessingJob('invoice-processing', 'started');
  
  try {
    // Process invoice file
    const result = await invoiceProcessor.processInvoice(req.file.path, {
      translateToFrench: req.body.translate !== 'false',
      inventoryLocation: req.body.location || 'main',
      requestId: req.requestId
    });
    
    // Update inventory if requested
    if (req.body.updateInventory === 'true') {
      await invoiceService.updateInventory(result, req.requestId);
    }
    
    // Archive file if requested
    if (req.body.archiveFile === 'true') {
      await invoiceService.archiveFile(req.file.path, true);
    } else {
      // Otherwise, clean up temporary file
      fs.unlinkSync(req.file.path);
    }
    
    // Track processing job completion
    const duration = timer.end();
    monitoring.trackProcessingJob('invoice-processing', 'completed', duration);
    monitoring.trackResponseTime('/api/invoices/process', duration);
    
    // Return results
    res.json({
      success: true,
      invoiceNumber: result.invoiceNumber,
      invoiceDate: result.invoiceDate,
      vendor: result.vendor,
      items: result.items,
      total: result.total,
      processingTime: result.processingTime
    });
  } catch (error) {
    // Track processing job failure
    const duration = timer.end();
    monitoring.trackProcessingJob('invoice-processing', 'failed', duration);
    
    // Clean up temporary file if it exists and not archived
    if (req.file && fs.existsSync(req.file.path) && req.body.archiveFile !== 'true') {
      fs.unlinkSync(req.file.path);
    }
    
    // Let error middleware handle the error
    throw error;
  }
}));

/**
 * Process all invoices in the input directory
 * @route POST /api/invoices/process-all
 */
router.post('/process-all', asyncHandler(async (req, res) => {
  monitoring.trackApiCall('/api/invoices/process-all', 'POST');
  const timer = logger.startTimer();
  
  logger.info('Process all invoices request received', {
    module: 'invoice-routes',
    requestId: req.requestId
  });
  
  try {
    // Process all invoices
    const result = await invoiceService.processAllInvoices();
    
    const duration = timer.end();
    monitoring.trackResponseTime('/api/invoices/process-all', duration);
    
    res.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      message: result.message
    });
  } catch (error) {
    // Let error middleware handle the error
    throw error;
  }
}));

/**
 * Get invoice processing status
 * @route GET /api/invoices/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  monitoring.trackApiCall('/api/invoices/status', 'GET');
  
  const processingJobs = monitoring.getMetrics().detailed.processingJobs['invoice-processing'] || {
    started: 0,
    completed: 0,
    failed: 0,
    avgDuration: 0
  };
  
  res.json({
    status: 'available',
    enabled: invoiceService.enabled,
    schedule: invoiceService.schedule,
    jobs: {
      total: processingJobs.started || 0,
      completed: processingJobs.completed || 0,
      failed: processingJobs.failed || 0,
      avgProcessingTime: Math.round(processingJobs.avgDuration || 0)
    },
    supportedFormats: invoiceService.allowedFileTypes
  });
}));

module.exports = router;