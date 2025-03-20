/**
 * Voice processing API endpoints
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const voiceProcessor = require('../modules/voice-processor');
const dbUtils = require('../utils/database-utils');
const { authenticateApiKey } = require('../middleware/auth');
const logger = require('../utils/logger');
const monitoring = require('../utils/monitoring');
const config = require('../config');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = config.uploads.voiceDir || './uploads/voice';
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `recording-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

/**
 * @route POST /api/voice/process
 * @desc Process voice recording to update inventory
 * @access Protected
 */
router.post('/process', authenticateApiKey, upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    monitoring.recordApiUsage('processVoice');
    logger.info(`Processing voice file: ${req.file.filename}`);
    
    // Process the audio file
    const result = await voiceProcessor.processAudio(req.file.path);
    
    // Update inventory if items were identified
    if (result.items && result.items.length > 0) {
      await dbUtils.saveInventoryItems(result.items);
      logger.info(`Updated inventory with ${result.items.length} items from voice recording`);
    }
    
    return res.status(200).json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      items: result.items
    });
  } catch (error) {
    logger.error(`Error processing voice recording: ${error.message}`);
    return res.status(500).json({ error: 'Failed to process voice recording' });
  }
});

module.exports = router;
