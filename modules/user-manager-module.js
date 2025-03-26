/**
 * Module de gestion des utilisateurs
 * Gère les utilisateurs, leurs autorisations et leurs profils vocaux
 */
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const databaseUtils = require('../utils/database-utils');
const { ExternalServiceError } = require('../utils/error-handler');

// Cache pour les profils d'utilisateurs
const userCache = {};
const voiceProfilesCache = {};
const authorizationCache = {};

/**
 * Récupère un utilisateur par son ID
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object|null>} - Informations sur l'utilisateur
 */
async function getUserById(userId) {
  try {
    // Vérifier le cache
    if (userCache[userId]) {
      return userCache[userId];
    }
    
    // Dans une implémentation réelle, récupérer depuis la base de données
    // Ici, nous simulons la récupération utilisateur
    const user = await databaseUtils.getUserById(userId);
    
    if (user) {
      // Mettre en cache
      userCache[userId] = user;
      return user;
    }
    
    return null;
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'utilisateur ${userId}: ${error.message}`);
    return null;
  }
}

/**
 * Vérifie si un utilisateur est autorisé pour un emplacement
 * @param {string} userId - ID de l'utilisateur
 * @param {string} location - Emplacement à vérifier
 * @returns {Promise<boolean>} - Autorisation de l'utilisateur
 */
async function checkUserAuthorization(userId, location) {
  try {
    // Vérifier le cache
    const cacheKey = `${userId}:${location}`;
    if (authorizationCache[cacheKey] !== undefined) {
      return authorizationCache[cacheKey];
    }
    
    // Dans une implémentation réelle, vérifier dans la base de données
    // Ici, nous simulons la vérification d'autorisation
    const isAuthorized = await databaseUtils.checkUserAuthorization(userId, location);
    
    // Mettre en cache
    authorizationCache[cacheKey] = isAuthorized;
    
    return isAuthorized;
  } catch (error) {
    logger.error(`Erreur lors de la vérification d'autorisation: ${error.message}`);
    return false;
  }
}

/**
 * Récupère les profils vocaux d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array<Object>>} - Profils vocaux de l'utilisateur
 */
async function getVoiceProfiles(userId) {
  try {
    // Vérifier le cache
    if (voiceProfilesCache[userId]) {
      return voiceProfilesCache[userId];
    }
    
    // Dans une implémentation réelle, récupérer depuis la base de données
    // Ici, nous simulons la récupération des profils
    const profiles = await loadVoiceProfilesFromDisk(userId);
    
    // Mettre en cache
    voiceProfilesCache[userId] = profiles;
    
    return profiles;
  } catch (error) {
    logger.error(`Erreur lors de la récupération des profils vocaux: ${error.message}`);
    return [];
  }
}

/**
 * Charge les profils vocaux depuis le disque
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array<Object>>} - Profils vocaux chargés
 */
async function loadVoiceProfilesFromDisk(userId) {
  try {
    const profilesDir = path.join(__dirname, '../data/voice-profiles', userId);
    
    // Vérifier si le répertoire existe
    try {
      await fs.access(profilesDir);
    } catch (err) {
      // Créer le répertoire s'il n'existe pas
      await fs.mkdir(profilesDir, { recursive: true });
      return [];
    }
    
    // Lire les fichiers de profil
    const files = await fs.readdir(profilesDir);
    const profiles = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const profilePath = path.join(profilesDir, file);
          const profileData = await fs.readFile(profilePath, 'utf8');
          const profile = JSON.parse(profileData);
          profiles.push(profile);
        } catch (err) {
          logger.warn(`Impossible de charger le profil: ${file}`, err);
        }
      }
    }
    
    return profiles;
  } catch (error) {
    logger.error(`Erreur lors du chargement des profils depuis le disque: ${error.message}`);
    return [];
  }
}

/**
 * Sauvegarde un profil vocal
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} profile - Profil à sauvegarder
 * @returns {Promise<boolean>} - Succès de la sauvegarde
 */
async function saveVoiceProfile(userId, profile) {
  try {
    const profilesDir = path.join(__dirname, '../data/voice-profiles', userId);
    
    // Créer le répertoire si nécessaire
    await fs.mkdir(profilesDir, { recursive: true });
    
    // Générer un ID pour le profil s'il n'en a pas
    if (!profile.id) {
      profile.id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Ajouter les métadonnées
    profile.userId = userId;
    profile.updatedAt = new Date().toISOString();
    if (!profile.createdAt) {
      profile.createdAt = profile.updatedAt;
    }
    
    // Sauvegarder le profil
    const profilePath = path.join(profilesDir, `${profile.id}.json`);
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
    
    // Mettre à jour le cache
    if (!voiceProfilesCache[userId]) {
      voiceProfilesCache[userId] = [];
    }
    
    // Remplacer le profil s'il existe déjà, sinon l'ajouter
    const existingIndex = voiceProfilesCache[userId].findIndex(p => p.id === profile.id);
    if (existingIndex >= 0) {
      voiceProfilesCache[userId][existingIndex] = profile;
    } else {
      voiceProfilesCache[userId].push(profile);
    }
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la sauvegarde du profil vocal: ${error.message}`);
    return false;
  }
}

/**
 * Met à jour la date de dernière connexion d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<boolean>} - Succès de la mise à jour
 */
async function updateLastLogin(userId) {
  try {
    // Dans une implémentation réelle, mettre à jour la base de données
    // Ici, nous simulons la mise à jour
    const user = await getUserById(userId);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      
      // Mettre à jour le cache
      userCache[userId] = user;
      
      // Sauvegarder dans la base de données
      await databaseUtils.updateUser(user);
      
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la dernière connexion: ${error.message}`);
    return false;
  }
}

/**
 * Crée un nouvel utilisateur
 * @param {Object} userData - Données de l'utilisateur
 * @returns {Promise<Object|null>} - Utilisateur créé
 */
async function createUser(userData) {
  try {
    // Valider les données
    if (!userData.name || !userData.email) {
      throw new Error("Le nom et l'email sont obligatoires");
    }
    
    // Générer un ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Créer l'utilisateur
    const user = {
      id: userId,
      name: userData.name,
      email: userData.email,
      role: userData.role || 'user',
      authorizedLocations: userData.authorizedLocations || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null
    };
    
    // Sauvegarder dans la base de données
    await databaseUtils.createUser(user);
    
    // Mettre en cache
    userCache[userId] = user;
    
    return user;
  } catch (error) {
    logger.error(`Erreur lors de la création de l'utilisateur: ${error.message}`);
    return null;
  }
}

/**
 * Met à jour les autorisations d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {Array<string>} locations - Emplacements autorisés
 * @returns {Promise<boolean>} - Succès de la mise à jour
 */
async function updateUserAuthorizations(userId, locations) {
  try {
    // Mettre à jour l'utilisateur
    const user = await getUserById(userId);
    
    if (!user) {
      throw new Error(`Utilisateur ${userId} introuvable`);
    }
    
    user.authorizedLocations = locations;
    user.updatedAt = new Date().toISOString();
    
    // Mettre à jour la base de données
    await databaseUtils.updateUser(user);
    
    // Mettre à jour le cache
    userCache[userId] = user;
    
    // Vider le cache d'autorisation pour cet utilisateur
    Object.keys(authorizationCache).forEach(key => {
      if (key.startsWith(`${userId}:`)) {
        delete authorizationCache[key];
      }
    });
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour des autorisations: ${error.message}`);
    return false;
  }
}

/**
 * Supprime un profil vocal
 * @param {string} userId - ID de l'utilisateur
 * @param {string} profileId - ID du profil
 * @returns {Promise<boolean>} - Succès de la suppression
 */
async function deleteVoiceProfile(userId, profileId) {
  try {
    const profilePath = path.join(__dirname, '../data/voice-profiles', userId, `${profileId}.json`);
    
    // Vérifier si le fichier existe
    try {
      await fs.access(profilePath);
    } catch (err) {
      logger.warn(`Profil ${profileId} non trouvé pour l'utilisateur ${userId}`);
      return false;
    }
    
    // Supprimer le fichier
    await fs.unlink(profilePath);
    
    // Mettre à jour le cache
    if (voiceProfilesCache[userId]) {
      voiceProfilesCache[userId] = voiceProfilesCache[userId].filter(p => p.id !== profileId);
    }
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la suppression du profil vocal: ${error.message}`);
    return false;
  }
}

// Initialiser les caches au démarrage
async function initializeCache() {
  try {
    logger.info('Initialisation des caches utilisateurs...');
    
    // Dans une implémentation réelle, précharger les utilisateurs et leurs autorisations
    // Ici, nous laissons les caches se remplir à la demande
    
    logger.info('Caches utilisateurs initialisés');
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation des caches: ${error.message}`);
  }
}

// Initialiser les caches au chargement du module
initializeCache().catch(err => {
  logger.error(`Échec de l'initialisation des caches: ${err.message}`);
});

// Nettoyer les caches périodiquement
setInterval(() => {
  const now = new Date();
  const cacheTimeout = 30 * 60 * 1000; // 30 minutes
  
  // Nettoyer le cache utilisateur
  Object.keys(userCache).forEach(userId => {
    const user = userCache[userId];
    if (user.lastAccessed) {
      const lastAccess = new Date(user.lastAccessed);
      
      if (now - lastAccess > cacheTimeout) {
        delete userCache[userId];
      }
    }
  });
  
  // Nettoyer le cache d'autorisation
  Object.keys(authorizationCache).forEach(key => {
    const auth = authorizationCache[key];
    if (auth.timestamp) {
      const timestamp = new Date(auth.timestamp);
      
      if (now - timestamp > cacheTimeout) {
        delete authorizationCache[key];
      }
    }
  });
}, 60 * 60 * 1000); // Nettoyer toutes les heures

module.exports = {
  getUserById,
  checkUserAuthorization,
  getVoiceProfiles,
  saveVoiceProfile,
  updateLastLogin,
  createUser,
  updateUserAuthorizations,
  deleteVoiceProfile
};