/**
 * Module de gestion des utilisateurs
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { NotFoundError, AuthorizationError } = require('../utils/error-handler');

// Mock de base de données utilisateurs pour les tests
const users = {
  'user-1': {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    authorizedLocations: ['cuisine_maison', 'cuisine_bicoque', 'boisson_bicoque', 'boisson_maison'],
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  'user-2': {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'manager',
    authorizedLocations: ['cuisine_maison', 'boisson_maison'],
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  'user-3': {
    id: 'user-3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'staff',
    authorizedLocations: ['boisson_bicoque'],
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
};

// Mock de profils vocaux
const voiceProfiles = {
  'user-1': [
    {
      id: 'profile-1',
      userId: 'user-1',
      type: 'calibration',
      status: 'completed',
      data: {
        keywords: ['vodka', 'vin', 'bière', 'whisky', 'bouteille', 'cannette'],
        speechCharacteristics: {
          pitchAverage: 120,
          speedWords: 1.5,
          articulationScore: 85
        }
      },
      createdAt: new Date().toISOString()
    }
  ]
};

/**
 * Récupère un utilisateur par ID
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Utilisateur trouvé
 */
async function getUserById(userId) {
  if (!userId) {
    throw new Error('ID utilisateur requis');
  }
  
  logger.info(`Récupération de l'utilisateur ${userId}`);
  
  const user = users[userId];
  if (!user) {
    logger.warn(`Utilisateur ${userId} non trouvé`);
    throw new NotFoundError('Utilisateur', userId);
  }
  
  return { ...user };
}

/**
 * Vérifie si un utilisateur est autorisé pour un emplacement
 * @param {string} userId - ID de l'utilisateur
 * @param {string} location - Emplacement à vérifier
 * @returns {Promise<boolean>} - Indique si l'utilisateur est autorisé
 */
async function checkUserAuthorization(userId, location) {
  if (!userId || !location) {
    logger.warn('ID utilisateur et emplacement requis pour la vérification d\'autorisation');
    return false;
  }
  
  try {
    const user = await getUserById(userId);
    
    // Les administrateurs ont accès à tout
    if (user.role === 'admin') {
      return true;
    }
    
    // Vérifier les emplacements autorisés
    return user.authorizedLocations.includes(location);
  } catch (error) {
    logger.error(`Erreur lors de la vérification d'autorisation: ${error.message}`);
    return false;
  }
}

/**
 * Met à jour la date de dernière connexion d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Utilisateur mis à jour
 */
async function updateLastLogin(userId) {
  logger.info(`Mise à jour de la dernière connexion pour l'utilisateur ${userId}`);
  
  if (!users[userId]) {
    throw new NotFoundError('Utilisateur', userId);
  }
  
  users[userId].lastLogin = new Date().toISOString();
  
  return { ...users[userId] };
}

/**
 * Récupère les profils vocaux d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} - Profils vocaux
 */
async function getVoiceProfiles(userId) {
  logger.info(`Récupération des profils vocaux pour l'utilisateur ${userId}`);
  
  if (!voiceProfiles[userId]) {
    return [];
  }
  
  return [...voiceProfiles[userId]];
}

module.exports = {
  getUserById,
  checkUserAuthorization,
  updateLastLogin,
  getVoiceProfiles
};
