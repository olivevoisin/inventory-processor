const express = require('express');
const router = express.Router();
const voiceProcessor = require('../modules/voice-processor'); // Ensure proper import
const database = require('../utils/database-utils');
const logger = require('../utils/logger');
const { authenticateApiKey } = require('../middleware/auth');

router.post('/process', authenticateApiKey, async (req, res) => {
  try {
    logger.info('Received request for /process', { body: req.body });

    if (!req.body.audio) {
      logger.error('Audio data is missing in the request body', { body: req.body });
      return res.status(400).json({ success: false, message: 'Audio data is required' });
    }

    if (!req.body.location) {
      logger.error('Location is missing in the request body', { body: req.body });
      return res.status(400).json({ success: false, message: 'Location is required' });
    }

    // Decode base64 audio data
    const audioBuffer = Buffer.from(req.body.audio, 'base64');
    logger.info('Decoded audio data', { audioLength: audioBuffer.length });

    const transcript = await voiceProcessor.processAudio(audioBuffer);
    logger.info('Transcription result', { transcript });

    if (!transcript || !transcript.items || transcript.items.length === 0) {
      logger.error('Transcription failed or returned no items', { transcript });
      return res.status(400).json({ success: false, message: 'Transcription failed' });
    }

    const savedItems = await database.saveInventoryItems(transcript.items);
    logger.info('Voice processing completed successfully', { savedItemsCount: savedItems.savedCount });
    res.status(200).json({ success: true, transcript, items: savedItems });
  } catch (error) {
    logger.error('Error processing voice input:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/status/:id', authenticateApiKey, (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID is required' });
  }

  res.status(200).json({
    success: true,
    status: 'processed',
    jobId: id
  });
});

// Add extra voice command route
router.get('/command', (req, res) => {
  const action = req.query.action;
  if (action === 'start') {
    return res.status(200).json({ success: true, message: 'Voice processing started' });
  } else if (action === 'stop') {
    return res.status(200).json({ success: true, message: 'Voice processing stopped' });
  } else {
    return res.status(400).json({ success: false, error: 'Invalid voice command' });
  }
});

module.exports = {
  router,
  database // Export database for mocking in tests
};
