/**
 * Routes pour le traitement vocal
 * Expose les fonctionnalités de reconnaissance vocale via API
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const voiceProcessor = require('../modules/voice-processor-extended');
const speechRecognition = require('../modules/speech-recognition');
const { asyncHandler } = require('../utils/error-handler');

// Configuration de stockage pour les fichiers audio
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/audio');
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const randomId = uuidv4().slice(0, 8);
    const originalExt = path.extname(file.originalname);
    cb(null, `voice_${timestamp}_${randomId}${originalExt}`);
  }
});

// Configuration de multer
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté. Formats acceptés: mp3, wav, m4a, ogg, webm'));
    }
  }
});

/**
 * @route   GET /api/voice/test
 * @desc    Test de fonctionnement de l'API vocale
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API de traitement vocal fonctionnelle',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/voice/calibration
 * @desc    Démarrer une session de calibration vocale
 * @access  Private
 */
router.post('/calibration', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "L'ID utilisateur est requis"
    });
  }
  
  const session = await speechRecognition.startListening('calibration', userId);
  
  res.status(200).json({
    success: true,
    session,
    message: 'Session de calibration démarrée'
  });
}));

/**
 * @route   POST /api/voice/process
 * @desc    Traiter un fichier audio pour l'inventaire
 * @access  Private
 */
router.post('/process', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Aucun fichier audio n'a été téléchargé"
    });
  }
  
  const { location, period, userId } = req.body;
  
  if (!location || !period) {
    return res.status(400).json({
      success: false,
      message: "L'emplacement et la période sont requis"
    });
  }
  
  // Traiter le fichier audio
  const result = await voiceProcessor.processVoiceFile(
    req.file.path,
    location,
    period,
    userId || 'anonymous'
  );
  
  res.status(200).json({
    success: true,
    result,
    fileName: req.file.filename,
    fileSize: req.file.size,
    message: 'Fichier audio traité avec succès'
  });
}));

/**
 * @route   POST /api/voice/session/start
 * @desc    Démarrer une session d'enregistrement
 * @access  Private
 */
router.post('/session/start', asyncHandler(async (req, res) => {
  const { mode, userId, location, period } = req.body;
  
  if (!mode || !userId || !location || !period) {
    return res.status(400).json({
      success: false,
      message: "Le mode, l'ID utilisateur, l'emplacement et la période sont requis"
    });
  }
  
  const sessionInfo = await speechRecognition.startListening(
    mode,
    userId,
    location,
    period,
    req.body.options
  );
  
  res.status(200).json({
    success: true,
    session: sessionInfo,
    message: `Session d'écoute démarrée en mode ${mode}`
  });
}));

/**
 * @route   POST /api/voice/session/:sessionId/audio
 * @desc    Envoyer un segment audio dans une session active
 * @access  Private
 */
router.post('/session/:sessionId/audio', upload.single('file'), asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Aucun fichier audio n'a été téléchargé"
    });
  }
  
  // Lire le fichier audio
  const audioData = await fs.readFile(req.file.path);
  
  // Traiter le segment audio
  const result = await speechRecognition.processAudioSegment(audioData, sessionId);
  
  // Supprimer le fichier temporaire après traitement
  try {
    await fs.unlink(req.file.path);
  } catch (unlinkError) {
    logger.warn(`Impossible de supprimer le fichier temporaire: ${unlinkError.message}`);
  }
  
  res.status(200).json({
    success: true,
    result,
    message: 'Segment audio traité avec succès'
  });
}));

/**
 * @route   POST /api/voice/session/:sessionId/stop
 * @desc    Terminer une session d'écoute
 * @access  Private
 */
router.post('/session/:sessionId/stop', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const result = await speechRecognition.stopListening(sessionId);
  
  res.status(200).json({
    success: true,
    result,
    message: 'Session terminée avec succès'
  });
}));

/**
 * @route   POST /api/voice/session/:sessionId/confirm
 * @desc    Confirmer une action avec retour sonore
 * @access  Private
 */
router.post('/session/:sessionId/confirm', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { type, message } = req.body;
  
  if (!type) {
    return res.status(400).json({
      success: false,
      message: 'Le type de confirmation est requis'
    });
  }
  
  const result = await speechRecognition.confirmAction(type, message);
  
  res.status(200).json({
    success: true,
    result,
    message: 'Confirmation envoyée avec succès'
  });
}));

/**
 * @route   GET /api/voice/profile/:userId
 * @desc    Récupérer les profils vocaux d'un utilisateur
 * @access  Private
 */
router.get('/profile/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Cette route serait normalement protégée par authentification
  
  // Récupérer les profils
  const profiles = await voiceProcessor.loadUserVoiceProfile(userId);
  
  res.status(200).json({
    success: true,
    profiles: profiles || [],
    message: profiles ? 'Profils vocaux récupérés avec succès' : 'Aucun profil vocal trouvé'
  });
}));

/**
 * @route   GET /api/voice/phrases
 * @desc    Récupérer les phrases de test pour la calibration
 * @access  Public
 */
router.get('/phrases', (req, res) => {
  const phrases = voiceProcessor.generateCalibrationTestPhrases();
  
  res.status(200).json({
    success: true,
    phrases,
    message: 'Phrases de calibration récupérées avec succès'
  });
});

module.exports = router;