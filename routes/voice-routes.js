/**voice-routes.js
 * Routes for voice processing
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {  validationMiddleware } = require('../middleware/validation');
const voiceProcessor = require('../modules/voice-processor');
const databaseUtils = require('../utils/database-utils');
const logger = require('../utils/logger');
const errorHandler = require('../utils/error-handler');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Process voice recording and optionally save to inventory
 * @route POST /api/voice/process
 * @param {file} audioFile - Audio file to process
 * @param {string} location - Location metadata
 * @param {boolean} saveToInventory - Whether to save to inventory (optional)
 * @returns {object} Processing results including transcript
 */

router.use(authenticateApiKey);

router.post('/process', (req, res, next) => {
  // Enhanced logging for request debugging
  logger.debug('Voice processing request received', { 
    hasFiles: !!req.files, 
    hasAudioFile: req.files ? !!req.files.audioFile : false,
    bodyParams: Object.keys(req.body)
  });


  // Check for audio file first with detailed error
  if (!req.files || !req.files.audioFile) {
    logger.warn('Voice processing request missing audio file');
    return res.status(400).json({ 
      success: false, 
      error: 'No audio file provided',
      details: 'Request must include a file uploaded with field name "audioFile"'
    });
  }
  
  // Then check for location with detailed error
  if (!req.body.location) {
    logger.warn('Voice processing request missing location parameter');
    return res.status(400).json({ 
      success: false, 
      error: 'Location is required',
      details: 'The "location" field must be provided in request body'
    });
  }
  
  // More robust validation for saveToInventory parameter
  let saveToInventory = false;
  if (req.body.saveToInventory !== undefined) {
    // Handle various truthy formats
    if (req.body.saveToInventory === 'true' || 
        req.body.saveToInventory === true ||
        req.body.saveToInventory === '1' ||
        req.body.saveToInventory === 1) {
      saveToInventory = true;
    }
  }
  
  // Log processing parameters for debugging
  logger.info('Processing voice file', {
    fileSize: req.files.audioFile.size,
    fileType: req.files.audioFile.mimetype,
    location: req.body.location,
    saveToInventory
  });
  
  // Process the voice file with enhanced error handling
  try {
    const result = voiceProcessor.processVoiceFile(req.files.audioFile, {
      location: req.body.location,
      saveToInventory: saveToInventory
    });
    
    logger.info('Voice processing succeeded', { 
      hasTranscript: !!result.transcript,
      transcriptLength: result.transcript ? result.transcript.length : 0
    });
    
    return res.status(200).json({
      success: true,
      transcript: result.transcript,
      processedAt: new Date().toISOString(),
      savedToInventory: saveToInventory
    });
  } catch (error) {
    logger.error('Voice processing failed', { 
      error: error.message,
      stack: error.stack
    });
    
    // Use consistent error handler format
    return errorHandler.handleApiError(res, error, 'Error processing voice file');
  }
});



router.post('/process', upload.single('audioFile'), async (req, res) => {
  
  
  
  // Ensure req.body is always an object
  if (!req.body) req.body = {};

  // Validate audio file
  let audioInput;
  if (req.file && req.file.buffer && req.file.buffer.length > 0) {
    audioInput = req.file.buffer;
  } else {
    return res.status(400).json({ success: false, error: 'No audio file provided' });
  }

  // Extract location
  let location = req.body.location || req.body['location'];
  if (Array.isArray(location)) location = location[0];
  if (!location) {
    return res.status(400).json({ success: false, error: 'Location is required' });
  }

  // Extract saveToInventory
  let saveToInventory = req.body.saveToInventory || req.body['saveToInventory'];
  if (Array.isArray(saveToInventory)) saveToInventory = saveToInventory[0];

  try {
    const result = await voiceProcessor.processVoiceFile(audioInput, location, req.body.period);

    if (!result || !result.transcript) {
      return res.status(400).json({ success: false, error: 'Voice processing failed' });
    }

    if (saveToInventory !== 'false') {
      await databaseUtils.saveInventoryItems(result.items);
    }

    return res.status(200).json({
      success: true,
      transcript: result.transcript,
      items: result.items
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});



router.get('/status/:id', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'processed',
    jobId: req.params.id
  });
});

module.exports = router;
