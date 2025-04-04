/**
 * Routes for voice processing API
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const voiceProcessor = require('../modules/voice-processor');
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

module.exports = router;
