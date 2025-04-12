/**
<<<<<<< HEAD
 * Routes for voice processing API
=======
 * Routes for voice processing
>>>>>>> backup-main
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const voiceProcessor = require('../modules/voice-processor');
<<<<<<< HEAD
const databaseUtils = require('../utils/database-utils');
const { asyncHandler } = require('../utils/error-handler');
const logger = require('../utils/logger');

// Basic file upload handling
const upload = multer({ dest: 'uploads/' });

/**
 * @route POST /api/voice/process
 * @desc Process voice recording
 */
router.post('/process', upload.single('file'), asyncHandler(async (req, res) => {
  const filePath = req.file ? req.file.path : '';
  const location = req.body.location || 'default';
  
  const result = await voiceProcessor.processVoiceFile(filePath, location);
  
  if (result.items && result.items.length > 0) {
    await databaseUtils.saveInventoryItems(result.items);
  }
  
  res.json(result);
}));
=======
const dbUtils = require('../utils/database-utils');
const { authenticateApiKey } = require('../middleware/auth');
const logger = require('../utils/logger');

// Configure storage for uploaded files
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Route for processing voice recordings
router.post('/process', 
  authenticateApiKey,
  upload.single('audioFile'),
  async (req, res) => {
    try {
      logger.info('Processing voice file upload');
      
      // Check if file was uploaded
      if (!req.file) {
        logger.error('No audio file provided');
        return res.status(400).json({
          success: false,
          error: 'No audio file provided'
        });
      }
      
      // Check if location was provided - ensure this check runs BEFORE any processing
      if (!req.body.location) {
        logger.error('Location is required');
        return res.status(400).json({
          success: false,
          error: 'Location is required'
        });
      }
      
      // Process the audio file
      const result = await voiceProcessor.processAudio(
        req.file.buffer,
        req.body.location
      );
      
      // Save inventory items
      await dbUtils.saveInventoryItems(result.items);
      
      logger.info('Voice processing completed successfully');
      
      // Return the result
      return res.status(200).json({
        success: true,
        transcript: result.transcript,
        items: result.items
      });
    } catch (error) {
      logger.error(`Error processing voice recording: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Route for checking job status
router.get('/status/:id', authenticateApiKey, (req, res) => {
  res.status(200).json({
    success: true,
    status: 'processed',
    jobId: req.params.id
  });
});
>>>>>>> backup-main

module.exports = router;
