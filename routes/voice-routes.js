// routes/voice-routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const voiceProcessor = require('../modules/voice-processor');
const database = require('../utils/database-utils');
const monitoring = require('../utils/monitoring');
const { asyncHandler, ValidationError } = require('../utils/error-handler');



// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/voice';
    
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
    // Accept only audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only audio files are allowed', ['file'], 'INVALID_FILE_TYPE'));
    }
  }
});


const validateProcessVoice = (req) => {
  const errors = [];
  if (!req.file) {
    errors.push({
      field: 'audio',
      message: 'Audio file is required'
    });
  }
  
  // Validate location if provided
  if (req.body.location && typeof req.body.location !== 'string') {
    errors.push({
      field: 'location',
      message: 'Location must be a string'
    });
  }
  
  // Validate updateInventory if provided
  if (req.body.updateInventory && 
      req.body.updateInventory !== 'true' && 
      req.body.updateInventory !== 'false') {
    errors.push({
      field: 'updateInventory',
      message: 'updateInventory must be either "true" or "false"'
    });
  }
  
  return errors;
  };


router.post('/process', upload.single('audio'), asyncHandler(async (req, res) => {
  // Track API call
  monitoring.trackApiCall('/api/voice/process', 'POST');
  const timer = logger.startTimer();
  
  logger.info('Voice processing request received', {
    module: 'voice-routes',
    requestId: req.requestId,
    fileName: req.file ? req.file.originalname : null
  });
  
  // Validate file was uploaded
  if (!req.file) {
    throw new ValidationError('No audio file provided', ['audio'], 'MISSING_FILE');
  }
  


  
  // Track processing job start
  monitoring.trackProcessingJob('voice-processing', 'started');
  
  try {
    // Process audio file
    const result = await voiceProcessor.processAudioFile(req.file.path, {
      inventoryLocation: req.body.location || 'main',
      requestId: req.requestId
    });
    
    // Update inventory if requested
    if (req.body.updateInventory === 'true') {
      await database.updateInventoryFromVoice(result.matchedProducts, req.requestId);
    }
    
    // Clean up temporary file
    fs.unlinkSync(req.file.path);
    
    // Track processing job completion
    const duration = timer.end();
    monitoring.trackProcessingJob('voice-processing', 'completed', duration);
    monitoring.trackResponseTime('/api/voice/process', duration);
    
    // Return results
    res.json({
      success: true,
      transcription: result.transcription,
      confidence: result.confidence,
      items: result.matchedProducts,
      processingTime: result.processingTime
    });
  } catch (error) {
    // Track processing job failure
    const duration = timer.end();
    monitoring.trackProcessingJob('voice-processing', 'failed', duration);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Let error middleware handle the error
    throw error;
  }
}));


router.get('/status', asyncHandler(async (req, res) => {
  monitoring.trackApiCall('/api/voice/status', 'GET');
  
  const processingJobs = monitoring.getMetrics().detailed.processingJobs['voice-processing'] || {
    started: 0,
    completed: 0,
    failed: 0,
    avgDuration: 0
  };
  
  res.json({
    status: 'available',
    jobs: {
      total: processingJobs.started || 0,
      completed: processingJobs.completed || 0,
      failed: processingJobs.failed || 0,
      avgProcessingTime: Math.round(processingJobs.avgDuration || 0)
    }
  });
}));

module.exports = router;