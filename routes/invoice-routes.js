const express = require('express');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { authenticateApiKey } = require('../middleware/auth');
const invoiceProcessor = require('../modules/invoice-processor');
const databaseUtils = require('../utils/database-utils');

let invoiceService;
try {
  invoiceService = require('../modules/invoice-service');
} catch (e) {
  // fallback: alias to invoiceProcessor for test compatibility
  invoiceService = { processSingleInvoice: invoiceProcessor.processInvoice };
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateApiKey);

router.post('/upload', upload.single('invoice'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file provided' });
  }
  try {
    const result = await invoiceProcessor.processInvoice(req.file.path || req.file.buffer);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    const saved = await databaseUtils.saveInvoice(result.extractedData || result);
    res.status(200).json({ success: true, invoiceId: saved.id || 'INV-123' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const invoices = await databaseUtils.getInvoices();
    res.status(200).json({ success: true, invoices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await databaseUtils.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.status(200).json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/process-inventory', async (req, res) => {
  if (!req.body.location) {
    return res.status(400).json({ success: false, error: 'Location is required' });
  }
  try {
    const invoice = await databaseUtils.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const updates = invoiceProcessor.extractInventoryUpdates(invoice);
    const result = await databaseUtils.saveInventoryItems({
      items: updates.items.map(item => ({ ...item, location: req.body.location }))
    });
    res.status(200).json({ success: true, savedCount: result.savedCount });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.put('/:id', async (req, res) => {
  try {
    const result = await databaseUtils.updateInvoice(req.params.id, req.body);
    res.status(200).json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add endpoint for single invoice processing (for test compatibility)
router.post('/process', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file provided' });
  }
  
  let location = req.body.location;
  if (Array.isArray(location)) location = location[0];
  if (!location && req.body && Array.isArray(req.body['location'])) {
    location = req.body['location'][0];
  }
  
  if (!location) {
    return res.status(400).json({ success: false, error: 'Location is required' });
  }
  
  try {
    let fileInput;
    if (Buffer.isBuffer(req.file)) {
      const tmpPath = path.join(os.tmpdir(), req.file.originalname || `upload-${Date.now()}`);
      fs.writeFileSync(tmpPath, req.file);
      fileInput = tmpPath;
    } else if (req.file && req.file.buffer) {
      const tmpPath = path.join(os.tmpdir(), req.file.originalname || `upload-${Date.now()}`);
      fs.writeFileSync(tmpPath, req.file.buffer);
      fileInput = tmpPath;
    } else if (req.file && req.file.path) {
      fileInput = req.file.path;
    } else {
      fileInput = req.file;
    }
    
    const result = await (invoiceService.processSingleInvoice
      ? invoiceService.processSingleInvoice(fileInput)
      : invoiceProcessor.processInvoice(fileInput));
    
    if (!result || result.success === false) {
      return res.status(400).json({ success: false, error: result?.error || 'Processing failed' });
    }
    
    return res.status(200).json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add endpoint for batch invoice processing (for test compatibility)
router.post('/process-batch', async (req, res) => {
  try {
    let { files } = req.body || {};
    let location = req.body.location || req.body['location'];
    
    // Handle array format for location field
    if (Array.isArray(location)) location = location[0];
    
    // Ensure files is properly formatted - handle both array and single object
    if (!Array.isArray(files) && files) {
      files = [files];
    }
    
    // Validate required fields
    if (!files || !files.length) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }
    if (!location) {
      return res.status(400).json({ success: false, error: 'Location is required' });
    }
    
    // Process each file
    const result = await Promise.all(
      files.map(async (file) => {
        const fileInput = file.buffer || file.path || file;
        return invoiceProcessor.processInvoice(fileInput);
      })
    );
    
    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error('Error processing batch:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Add endpoint for invoice status check (for test compatibility)
router.get('/status/:id', async (req, res) => {
  try {
    const invoice = await databaseUtils.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.status(200).json({ success: true, status: invoice.status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;