/**
 * Label recognition API routes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const labelRecognizer = require('../modules/label-recognizer');
const { asyncHandler } = require('../utils/error-handler');
const logger = require('../utils/logger');
const config = require('../config');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/labels');
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `label-${timestamp}${ext}`);
  }
});

// Define file filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG and PNG images are allowed'));
  }
};

// Create upload middleware
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

/**
 * @route POST /api/label/process
 * @desc Process a product label image
 * @access Protected
 */
router.post('/process', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided'
    });
  }
  
  logger.info(`Processing label image: ${req.file.path}`);
  
  try {
    // Process the image
    const result = await labelRecognizer.processLabelImage(req.file.path);
    
    // Add file info to result
    result.fileName = req.file.filename;
    result.filePath = req.file.path;
    
    if (req.body.location) {
      result.location = req.body.location;
    }
    
    return res.json(result);
  } catch (error) {
    logger.error(`Error processing label: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Error processing label',
      error: error.message
    });
  }
}));

/**
 * @route POST /api/label/process-base64
 * @desc Process a base64 encoded label image
 * @access Protected
 */
router.post('/process-base64', asyncHandler(async (req, res) => {
  if (!req.body.image) {
    return res.status(400).json({
      success: false,
      message: 'No base64 image provided'
    });
  }
  
  try {
    // Extract the base64 image data
    const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Save the image to disk for record-keeping
    const uploadDir = path.join(__dirname, '../uploads/labels');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const timestamp = Date.now();
    const filePath = path.join(uploadDir, `label-${timestamp}.jpg`);
    await fs.writeFile(filePath, imageBuffer);
    
    logger.info(`Processing base64 label image, saved to: ${filePath}`);
    
    // Process the image
    const result = await labelRecognizer.processLabelImage(imageBuffer);
    
    // Add file info and location to result
    result.filePath = filePath;
    
    if (req.body.location) {
      result.location = req.body.location;
    }
    
    return res.json(result);
  } catch (error) {
    logger.error(`Error processing base64 label: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: 'Error processing base64 label',
      error: error.message
    });
  }
}));

module.exports = router;
