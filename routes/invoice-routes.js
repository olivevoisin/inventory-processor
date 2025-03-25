/**
 * Invoice Processing Routes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const invoiceService = require('../modules/invoice-service');
const logger = require('../utils/logger');

// Set up file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'invoices');
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  }
});

// Get specific invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    
    // In a real implementation, this would fetch from database
    res.status(200).json({
      success: true,
      data: {
        id: invoiceId,
        date: '2023-01-15',
        total: '30,985',
        items: [
          { product: 'Vodka Grey Goose', count: 5, price: '14,995' },
          { product: 'Wine Cabernet', count: 10, price: '15,990' }
        ]
      }
    });
  } catch (error) {
    logger.error(`Error getting invoice: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process a single invoice
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const location = req.body.location;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required'
      });
    }
    
    const result = await invoiceService.processSingleInvoice(req.file.path, location);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Invoice processing error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process all invoices in a directory
router.post('/process-batch', async (req, res) => {
  try {
    const { sourceDir, processedDir } = req.body;
    
    if (!sourceDir || !processedDir) {
      return res.status(400).json({
        success: false,
        error: 'Both sourceDir and processedDir are required'
      });
    }
    
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Batch invoice processing error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
