/**
 * Invoice processing routes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const invoiceService = require('../modules/invoice-service');
const invoiceProcessor = require('../modules/invoice-processor'); // Ensure this uses the updated invoice-processor
const { validateRequestBody } = require('../middleware/validation');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const databaseUtils = require('../utils/database-utils'); // Added for database operations

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

/**
 * Process a single invoice file
 * Exported for testing
 */
const processSingleInvoice = async (req, res) => {
  try {
    // Validate required fields
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    if (!req.body.location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required'
      });
    }

    logger.info(`Processing invoice: ${req.file.originalname || 'unknown'}`);
    
    const result = await invoiceService.processSingleInvoice(
      req.file.path,
      req.body.location
    );

    return res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error processing invoice: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to process invoice',
      details: error.message
    });
  }
};

/**
 * Process a batch of invoices from a directory
 * Exported for testing
 */
const processBatchInvoices = async (req, res) => {
  try {
    const { sourceDir, processedDir } = req.body;
    
    logger.info(`Processing invoice batch from directory: ${sourceDir}`);
    
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    return res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error processing invoice batch: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to process invoice batch',
      details: error.message
    });
  }
};

/**
 * Get invoice processing history
 * Exported for testing
 */
const getInvoiceHistory = async (req, res) => {
  try {
    // Implementation for getting invoice history
    const history = await invoiceProcessor.getProcessingHistory();
    
    return res.json({
      success: true,
      history
    });
  } catch (error) {
    logger.error(`Error retrieving invoice history: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve invoice history',
      details: error.message
    });
  }
};

/**
 * Get invoice by ID
 * Exported for testing
 */
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await databaseUtils.getInvoiceById(req.params.id);
    if (invoice) {
      // New branch for found invoice (to increase coverage)
      return res.status(200).json({
        success: true,
        invoice
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Route registration
router.post('/process', auth.authenticateApiKey, upload.single('file'), processSingleInvoice);
router.post('/process-batch', auth.authenticateApiKey, validateRequestBody(['sourceDir', 'processedDir']), processBatchInvoices);
router.get('/history', auth.authenticateApiKey, getInvoiceHistory);
router.get('/:id', getInvoiceById);

// Export handlers for testing
module.exports = router;
module.exports.handlers = {
  processSingleInvoice,
  processBatchInvoices,
  getInvoiceHistory,
  getInvoiceById
};