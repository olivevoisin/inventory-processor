/**
 * Voice Processing Routes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const voiceWorkflow = require('../modules/voice-workflow');
const logger = require('../utils/logger');

// Set up file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'voice');
    
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
    const allowedTypes = ['.mp3', '.wav', '.m4a', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Process a voice recording
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
    
    const result = await voiceWorkflow.processVoiceRecording(req.file.path, location);
    
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Voice processing error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get status of a voice processing job
router.get('/status', async (req, res) => {
  try {
    const jobId = req.query.jobId;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required'
      });
    }
    
    // In a real implementation, this would query a job status database
    // For now, we'll just return a mock response
    res.status(200).json({
      success: true,
      status: 'completed',
      jobId
    });
  } catch (error) {
    logger.error(`Status check error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
