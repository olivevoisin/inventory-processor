/**
 * Routes pour le traitement vocal
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const voiceProcessor = require('../modules/voice-processor');
const databaseUtils = require('../utils/database-utils');
const { authenticateApiKey } = require('../middleware/auth');
const { asyncHandler } = require('../utils/error-handler');
const logger = require('../utils/logger');
const config = require('../config');

// Configuration du stockage pour les uploads audio
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = config.uploads.voiceDir;
    
    try {
      // Créer le répertoire s'il n'existe pas
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `audio-${timestamp}${extension}`;
    cb(null, filename);
  }
});

// Créer l'uploader de fichiers audio
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 Mo
  },
  fileFilter: (req, file, cb) => {
    // Vérifier les types de fichiers autorisés
    const allowedExtensions = ['.wav', '.mp3', '.ogg', '.m4a', '.aac'];
    const extension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non pris en charge. Formats audio acceptés: WAV, MP3, OGG, M4A, AAC'));
    }
  }
});

/**
 * @route POST /api/voice/process
 * @desc Traiter un enregistrement vocal pour l'inventaire
 * @access Protégé
 */
router.post('/process', 
  authenticateApiKey,
  upload.single('audioFile'),
  asyncHandler(async (req, res) => {
    // Vérifier si un fichier a été téléchargé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier audio fourni'
      });
    }
    
    // Récupérer le chemin du fichier et l'emplacement
    const filePath = req.file.path;
    const location = req.body.location || 'Bar';
    
    logger.info(`Traitement de l'enregistrement vocal: ${req.file.originalname}, emplacement: ${location}`);
    
    // Traiter l'audio
    const result = await voiceProcessor.processAudio(filePath, location);
    
    // Si des articles ont été reconnus, les enregistrer
    if (result.items && result.items.length > 0) {
      await databaseUtils.saveInventoryItems({
        location,
        items: result.items,
        date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Renvoyer le résultat
    return res.json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      items: result.items,
      itemCount: result.items.length
    });
  })
);

module.exports = router;
