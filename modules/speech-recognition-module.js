/**
 * Module de reconnaissance vocale
 * Gère les différents modes d'enregistrement, la reconnaissance et la confirmation
 */
const logger = require('../utils/logger');
const voiceProcessor = require('./voice-processor-extended');
const userManager = require('./user-manager');

// Cache pour les instances de reconnaissance vocale
const recognitionInstances = {};

/**
 * Démarre l'écoute dans le mode spécifié
 * @param {string} mode - Mode d'écoute ('calibration', 'continu', 'interactif')
 * @param {string} userId - ID de l'utilisateur
 * @param {string} location - Emplacement d'inventaire
 * @param {string} period - Période d'inventaire (YYYY-MM)
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Informations sur la session démarrée
 */
async function startListening(mode, userId, location, period, options = {}) {
  try {
    logger.info(`Démarrage de l'écoute en mode ${mode} pour l'utilisateur ${userId}`);
    
    // Vérifier l'autorisation de l'utilisateur
    const isAuthorized = await userManager.checkUserAuthorization(userId, location);
    if (!isAuthorized) {
      throw new Error(`L'utilisateur ${userId} n'est pas autorisé pour l'emplacement ${location}`);
    }
    
    // Récupérer les informations utilisateur
    const user = await userManager.getUserById(userId);
    if (!user) {
      throw new Error(`Utilisateur ${userId} introuvable`);
    }
    
    // Selon le mode, démarrer différents types de sessions
    let sessionInfo;
    
    switch (mode) {
      case 'calibration':
        // Démarrer une session de calibration
        sessionInfo = {
          mode: 'calibration',
          userId,
          userName: user.name,
          startTime: new Date().toISOString(),
          sessionId: `calibration_${Date.now()}_${userId}`,
          status: 'started',
          phrases: voiceProcessor.generateCalibrationTestPhrases()
        };
        
        logger.info(`Session de calibration démarrée pour ${user.name} (${userId})`);
        break;
        
      case 'continu':
        // Mode d'enregistrement continu (traitement différé)
        sessionInfo = {
          mode: 'continu',
          userId,
          userName: user.name,
          location,
          period,
          startTime: new Date().toISOString(),
          sessionId: `continu_${Date.now()}_${userId}`,
          status: 'started'
        };
        
        logger.info(`Session d'enregistrement continu démarrée pour ${user.name} (${userId})`);
        break;
        
      case 'interactif':
        // Mode interactif (confirmation immédiate)
        const interactiveSession = await voiceProcessor.startInteractiveSession(
          location, 
          period, 
          userId
        );
        
        sessionInfo = {
          mode: 'interactif',
          userId,
          userName: user.name,
          location,
          period,
          startTime: new Date().toISOString(),
          sessionId: interactiveSession.sessionId,
          status: 'started'
        };
        
        logger.info(`Session interactive démarrée pour ${user.name} (${userId})`);
        break;
        
      default:
        throw new Error(`Mode d'écoute non reconnu: ${mode}`);
    }
    
    // Stocker les informations de session
    recognitionInstances[sessionInfo.sessionId] = sessionInfo;
    
    // Mettre à jour la dernière activité de l'utilisateur
    await userManager.updateLastLogin(userId);
    
    return sessionInfo;
  } catch (error) {
    logger.error(`Erreur lors du démarrage de l'écoute: ${error.message}`);
    throw error;
  }
}

/**
 * Traite un segment audio dans le contexte d'une session active
 * @param {Buffer} audioData - Données audio
 * @param {string} sessionId - ID de la session
 * @returns {Promise<Object>} - Résultat du traitement
 */
async function processAudioSegment(audioData, sessionId) {
  try {
    // Vérifier que la session existe
    if (!recognitionInstances[sessionId]) {
      throw new Error(`Session ${sessionId} introuvable ou expirée`);
    }
    
    const session = recognitionInstances[sessionId];
    
    logger.info(`Traitement d'un segment audio pour la session ${sessionId} (mode: ${session.mode})`);
    
    let result;
    
    switch (session.mode) {
      case 'calibration':
        // Traiter comme une calibration vocale
        result = await voiceProcessor.performVoiceCalibration(
          audioData, 
          session.userId
        );
        
        // Mettre à jour le statut de la session
        session.status = 'completed';
        session.result = result;
        
        logger.info(`Calibration vocale terminée pour l'utilisateur ${session.userId}`);
        break;
        
      case 'continu':
        // Accumuler l'audio pour un traitement ultérieur
        if (!session.audioSegments) {
          session.audioSegments = [];
        }
        
        session.audioSegments.push({
          data: audioData,
          timestamp: new Date().toISOString()
        });
        
        // Simuler un résultat pour l'interface
        result = {
          success: true,
          mode: 'continu',
          segmentReceived: true,
          totalSegments: session.audioSegments.length,
          sessionId,
          message: `Segment audio ${session.audioSegments.length} reçu`
        };
        
        logger.info(`Segment audio ${session.audioSegments.length} reçu pour la session continue ${sessionId}`);
        break;
        
      case 'interactif':
        // Traiter immédiatement avec confirmation
        result = await voiceProcessor.processAudioSegment(
          audioData, 
          sessionId
        );
        
        // Générer un feedback audio si nécessaire
        if (result.success && result.item && !result.needsReview) {
          result.audioFeedback = await voiceProcessor.generateAudioFeedback(result.confirmationText);
        }
        
        logger.info(`Segment audio traité en mode interactif pour la session ${sessionId}`);
        break;
        
      default:
        throw new Error(`Mode de session non reconnu: ${session.mode}`);
    }
    
    // Mettre à jour l'horodatage de dernière activité
    session.lastActivity = new Date().toISOString();
    
    return result;
  } catch (error) {
    logger.error(`Erreur lors du traitement du segment audio: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Termine une session d'écoute
 * @param {string} sessionId - ID de la session à terminer
 * @returns {Promise<Object>} - Résumé de la session terminée
 */
async function stopListening(sessionId) {
  try {
    // Vérifier que la session existe
    if (!recognitionInstances[sessionId]) {
      throw new Error(`Session ${sessionId} introuvable ou expirée`);
    }
    
    const session = recognitionInstances[sessionId];
    
    logger.info(`Arrêt de la session d'écoute ${sessionId} (mode: ${session.mode})`);
    
    let result;
    
    switch (session.mode) {
      case 'calibration':
        // Retourner les résultats de calibration s'ils existent
        result = session.result || {
          success: false,
          message: 'La calibration n\'a pas été complétée'
        };
        break;
        
      case 'continu':
        // Traiter tous les segments audio accumulés
        if (session.audioSegments && session.audioSegments.length > 0) {
          // Dans une implémentation réelle, nous combinerions les segments
          // et les traiterions comme un seul fichier audio
          // Ici, nous simulons ce processus
          
          logger.info(`Traitement de ${session.audioSegments.length} segments audio accumulés pour la session ${sessionId}`);
          
          // Simuler le traitement du fichier combiné
          result = {
            success: true,
            mode: 'continu',
            processedSegments: session.audioSegments.length,
            message: `Traitement de ${session.audioSegments.length} segments audio terminé`,
            // Dans une vraie implémentation, nous aurions les éléments d'inventaire reconnus ici
            recognizedItems: [],
            timestamp: new Date().toISOString()
          };
        } else {
          result = {
            success: false,
            mode: 'continu',
            message: 'Aucun segment audio à traiter',
            timestamp: new Date().toISOString()
          };
        }
        break;
        
      case 'interactif':
        // Finaliser la session interactive
        result = await voiceProcessor.finishInteractiveSession(sessionId);
        break;
        
      default:
        throw new Error(`Mode de session non reconnu: ${session.mode}`);
    }
    
    // Marquer la session comme terminée
    session.status = 'completed';
    session.endTime = new Date().toISOString();
    
    // Supprimer la session du cache après un certain délai
    setTimeout(() => {
      delete recognitionInstances[sessionId];
      logger.info(`Session ${sessionId} supprimée du cache`);
    }, 3600000); // 1 heure
    
    return result;
  } catch (error) {
    logger.error(`Erreur lors de l'arrêt de la session d'écoute: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Confirme une action avec un retour (sonore, vibration ou vocal)
 * @param {string} type - Type de confirmation ('sound', 'vibration', 'voice')
 * @param {string} message - Message à confirmer (pour type 'voice')
 * @returns {Promise<Object>} - Résultat de la confirmation
 */
async function confirmAction(type, message = 'Action confirmée') {
  try {
    logger.info(`Confirmation de type ${type} avec message: "${message}"`);
    
    let result = {
      success: true,
      type,
      timestamp: new Date().toISOString()
    };
    
    switch (type) {
      case 'sound':
        // Générer un son de confirmation
        // Dans une implémentation réelle, cela déclencherait un son
        result.method = 'audio';
        result.audioUrl = '/api/audio/confirmation';
        break;
        
      case 'vibration':
        // Déclencher une vibration (pour les appareils mobiles)
        // Dans une implémentation réelle, cela déclencherait une vibration
        result.method = 'vibration';
        result.duration = 200; // ms
        break;
        
      case 'voice':
        // Générer une confirmation vocale
        const voiceFeedback = await voiceProcessor.generateAudioFeedback(message);
        result.method = 'voice';
        result.message = message;
        result.audioFeedback = voiceFeedback;
        break;
        
      default:
        throw new Error(`Type de confirmation non reconnu: ${type}`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Erreur lors de la confirmation: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Améliore la reconnaissance en utilisant le profil vocal de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} transcript - Texte transcrit
 * @returns {Promise<Object>} - Résultat de la reconnaissance améliorée
 */
async function recognizeWithProfile(userId, transcript) {
  try {
    logger.info(`Utilisation du profil vocal pour améliorer la reconnaissance: utilisateur ${userId}`);
    
    // Récupérer les profils vocaux de l'utilisateur
    const voiceProfiles = await userManager.getVoiceProfiles(userId);
    
    // Vérifier si l'utilisateur a des profils vocaux
    if (!voiceProfiles || voiceProfiles.length === 0) {
      return {
        success: false,
        message: `Aucun profil vocal trouvé pour l'utilisateur ${userId}`,
        transcript,
        timestamp: new Date().toISOString()
      };
    }
    
    // Trouver le profil de calibration le plus récent
    const calibrationProfile = voiceProfiles
      .filter(p => p.type === 'calibration' && p.status === 'completed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    if (!calibrationProfile) {
      return {
        success: false,
        message: `Aucun profil de calibration trouvé pour l'utilisateur ${userId}`,
        transcript,
        originalText: transcript,
        timestamp: new Date().toISOString()
      };
    }
    
    // Simuler une amélioration de la reconnaissance
    // Dans une implémentation réelle, cela utiliserait le profil pour améliorer la reconnaissance
    
    // Vérifier si le transcript contient des mots-clés du profil
    const keywords = calibrationProfile.data?.keywords || [];
    const keywordMatches = keywords.filter(keyword => 
      transcript.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Simuler un score de confiance basé sur les correspondances de mots-clés
    const confidenceBoost = keywordMatches.length > 0 ? 0.2 : 0;
    const baseConfidence = 0.7;
    const adjustedConfidence = Math.min(baseConfidence + confidenceBoost, 1.0);
    
    return {
      success: true,
      userId,
      transcript,
      originalText: transcript,
      enhancedText: transcript, // Dans une vraie implémentation, cela pourrait être amélioré
      confidenceScore: adjustedConfidence,
      profileUsed: true,
      profileId: calibrationProfile.id,
      keywordMatches,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Erreur lors de l'amélioration de la reconnaissance: ${error.message}`);
    return {
      success: false,
      error: error.message,
      transcript,
      timestamp: new Date().toISOString()
    };
  }
}

// Nettoyer les sessions inactives périodiquement
setInterval(() => {
  const now = new Date();
  const sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  Object.keys(recognitionInstances).forEach(sessionId => {
    const session = recognitionInstances[sessionId];
    if (session.lastActivity) {
      const lastActivity = new Date(session.lastActivity);
      
      if (now - lastActivity > sessionTimeout) {
        logger.info(`Session ${sessionId} expirée après inactivité`);
        delete recognitionInstances[sessionId];
      }
    }
  });
}, 15 * 60 * 1000); // Vérifier toutes les 15 minutes

module.exports = {
  startListening,
  processAudioSegment,
  stopListening,
  confirmAction,
  recognizeWithProfile
};