    // Mettre à jour avec les nouvelles données
    userVoiceProfiles[userId] = {
      ...profile,
      ...profileData,
      lastUpdated: new Date().toISOString()
    };
    
    logger.info(`Profil vocal mis à jour pour l'utilisateur: ${userId}`);
    
    // Persister le profil
    await saveUserProfile(userId, userVoiceProfiles[userId]);
    
    return userVoiceProfiles[userId];
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du profil vocal: ${error.message}`);
    throw new Error(`Impossible de mettre à jour le profil: ${error.message}`);
  }
}

/**
 * Persiste le profil vocal d'un utilisateur
 * @param {string} userId - Identifiant de l'utilisateur
 * @param {Object} profile - Profil à sauvegarder
 * @returns {Promise<void>}
 */
async function saveUserProfile(userId, profile) {
  try {
    // Créer le répertoire de profils si nécessaire
    const profilesDir = path.join(__dirname, '../data/voice-profiles');
    await fs.mkdir(profilesDir, { recursive: true });
    
    // Sauvegarder le profil
    const profilePath = path.join(profilesDir, `${userId}.json`);
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
    
    logger.info(`Profil vocal sauvegardé pour l'utilisateur: ${userId}`);
  } catch (error) {
    logger.error(`Erreur lors de la sauvegarde du profil: ${error.message}`);
    throw error;
  }
}

/**
 * Charge le profil vocal d'un utilisateur
 * @param {string} userId - Identifiant de l'utilisateur
 * @returns {Promise<Object|null>} - Profil chargé ou null
 */
async function loadUserVoiceProfile(userId) {
  try {
    // Si le profil est déjà en cache, le retourner
    if (userVoiceProfiles[userId]) {
      return userVoiceProfiles[userId];
    }
    
    const profilePath = path.join(__dirname, '../data/voice-profiles', `${userId}.json`);
    
    try {
      // Vérifier si le fichier existe
      await fs.access(profilePath);
    } catch (err) {
      logger.info(`Aucun profil trouvé pour l'utilisateur: ${userId}`);
      return null;
    }
    
    // Charger et parser le profil
    const profileData = await fs.readFile(profilePath, 'utf8');
    const profile = JSON.parse(profileData);
    
    // Mettre en cache
    userVoiceProfiles[userId] = profile;
    
    logger.info(`Profil vocal chargé pour l'utilisateur: ${userId}`);
    
    return profile;
  } catch (error) {
    logger.error(`Erreur lors du chargement du profil: ${error.message}`);
    return null;
  }
}

/**
 * Propose des actions pour les éléments non reconnus
 * @param {Array<Object>} unrecognizedItems - Éléments non reconnus
 * @returns {Array<Object>} - Actions suggérées pour chaque élément
 */
function suggestActionsForUnrecognizedItems(unrecognizedItems) {
  return unrecognizedItems.map(item => {
    return {
      originalItem: item,
      actions: [
        {
          type: 'repeat',
          description: 'Répéter la dictée pour ce produit'
        },
        {
          type: 'take_photo',
          description: 'Prendre une photo du produit'
        },
        {
          type: 'add_new',
          description: 'Ajouter comme nouveau produit à la base de données'
        },
        {
          type: 'skip',
          description: 'Ignorer ce produit'
        }
      ]
    };
  });
}

/**
 * Génère des phrases de test pour la calibration vocale
 * @returns {Object} - Phrases de test par catégorie
 */
function generateCalibrationTestPhrases() {
  return {
    simpleProducts: "trois bouteilles de vin rouge et deux cannettes de bière",
    complexProducts: "cinq bouteilles de gin tonic premium et une bouteille de whisky single malt",
    numbers: "dix-sept bouteilles, vingt-trois cannettes, quarante-cinq boîtes",
    units: "bouteilles de vin, cannettes de soda, grammes de sucre, kilogrammes de farine",
    commands: "terminer inventaire, annuler la dernière saisie, pause, reprendre l'enregistrement",
    longPhrase: "j'ai compté huit bouteilles de vin blanc, douze bouteilles de vin rouge, et vingt-quatre cannettes de bière pour l'inventaire de la cuisine"
  };
}

/**
 * Génère un texte de réponse pour la confirmation vocale
 * @param {Object} item - Élément d'inventaire reconnu
 * @returns {string} - Texte de confirmation
 */
function generateConfirmationText(item) {
  if (!item) {
    return "Je n'ai pas compris. Pourriez-vous répéter?";
  }
  
  if (item.needsReview) {
    if (item.possibleMatch) {
      return `J'ai peut-être entendu ${item.quantity} ${item.unit} de ${item.productName}. Est-ce correct?`;
    } else {
      return `Je n'ai pas reconnu le produit "${item.productName}". Voulez-vous l'ajouter à la base de données?`;
    }
  }
  
  return `Enregistré: ${item.quantity} ${item.unit} de ${item.productName}`;
}

/**
 * Génère du feedback audio à partir d'un texte (pour les confirmations vocales)
 * @param {string} text - Texte à convertir en audio
 * @returns {Promise<Object>} - Informations sur l'audio généré
 */
async function generateAudioFeedback(text) {
  // Note: dans une implémentation réelle, ceci utiliserait un service TTS
  // Pour cet exemple, simulons le processus
  
  try {
    logger.info(`Génération de feedback audio pour: "${text}"`);
    
    // Simuler un délai de génération audio
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Dans une vraie implémentation, retourner un buffer audio ou une URL
    return {
      success: true,
      text,
      audioFormat: 'mp3',
      durationMs: text.length * 80, // ~80ms par caractère (estimation)
      // Dans une implémentation réelle: audioUrl ou audioData
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Erreur lors de la génération du feedback audio: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Vérifie l'autorisation d'un utilisateur pour un emplacement
 * @param {string} userId - Identifiant de l'utilisateur
 * @param {string} location - Emplacement à vérifier
 * @returns {Promise<boolean>} - Indique si l'utilisateur est autorisé
 */
async function checkUserLocationAuthorization(userId, location) {
  try {
    // Dans un système réel, vérifier dans la base de données
    // Pour cet exemple, nous simulons une vérification
    
    // Liste des autorisations (simulée)
    const locationPermissions = {
      'cuisine_maison': ['user1', 'user2'],
      'cuisine_bicoque': ['user3', 'user4'],
      'boisson_bicoque': ['user2', 'user3'],
      'boisson_maison': ['user1', 'user4']
    };
    
    // Vérifier si l'utilisateur est autorisé pour cet emplacement
    return locationPermissions[location]?.includes(userId) || false;
  } catch (error) {
    logger.error(`Erreur lors de la vérification d'autorisation: ${error.message}`);
    return false;
  }
}

/**
 * Initialise les profils vocaux des utilisateurs au démarrage
 * @returns {Promise<void>}
 */
async function initializeUserProfiles() {
  try {
    const profilesDir = path.join(__dirname, '../data/voice-profiles');
    
    try {
      await fs.access(profilesDir);
    } catch (err) {
      // Créer le répertoire s'il n'existe pas
      await fs.mkdir(profilesDir, { recursive: true });
      logger.info(`Répertoire de profils vocaux créé: ${profilesDir}`);
      return;
    }
    
    // Charger tous les profils d'utilisateurs
    const files = await fs.readdir(profilesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const userId = file.replace('.json', '');
          const profilePath = path.join(profilesDir, file);
          const profileData = await fs.readFile(profilePath, 'utf8');
          userVoiceProfiles[userId] = JSON.parse(profileData);
          logger.info(`Profil vocal chargé pour l'utilisateur: ${userId}`);
        } catch (err) {
          logger.warn(`Impossible de charger le profil: ${file}`, err);
        }
      }
    }
    
    logger.info(`${Object.keys(userVoiceProfiles).length} profils vocaux chargés`);
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation des profils: ${error.message}`);
  }
}

// Initialiser les profils d'utilisateurs au chargement du module
initializeUserProfiles().catch(err => {
  logger.error(`Échec de l'initialisation des profils: ${err.message}`);
});

module.exports = {
  startInteractiveSession,
  processAudioSegment,
  finishInteractiveSession,
  processVoiceFile,
  transcribeAudio,
  extractInventoryItems,
  extractSingleInventoryItem,
  detectCommand,
  performVoiceCalibration,
  updateUserVoiceProfile,
  loadUserVoiceProfile,
  generateCalibrationTestPhrases,
  suggestActionsForUnrecognizedItems,
  checkUserLocationAuthorization,
  generateConfirmationText,
  generateAudioFeedback
};
