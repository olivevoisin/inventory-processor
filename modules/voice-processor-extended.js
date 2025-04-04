/**
 * Voice Processor Module
 * Handles voice commands for inventory management system
 */
const logger = require('../utils/logger');
const { findProductByName } = require('../utils/database-utils');

const userVoiceProfiles = {}; // Ensure this is defined

async function saveUserProfile(userId, profile) {
  // Mock implementation for saving user profiles
  logger.info(`Saving voice profile for user ${userId}`);
  return Promise.resolve();
}

/**
 * Convert text to number
 * @param {string} text - Text to convert
 * @returns {number} - Converted number
 */
function textToNumber(text) {
  const wordToNumberMap = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };

  // Check if the text is a numeric string
  if (!isNaN(text)) {
    return parseInt(text, 10);
  }

  // Check if the text matches a word-based number
  const lowerCaseText = text.toLowerCase();
  if (wordToNumberMap[lowerCaseText] !== undefined) {
    return wordToNumberMap[lowerCaseText];
  }

  // Default fallback
  return 1;
}

/**
 * Process voice command to find product by name
 * @param {string} command - Voice command
 * @returns {Promise<Object|null>} - Product object or null if not found
 */
async function processVoiceCommand(command) {
  try {
    const productName = command.replace('find', '').trim();
    const product = await findProductByName(productName);
    return product;
  } catch (error) {
    logger.error(`Error processing voice command: ${error.message}`);
    return null;
  }
}

/**
 * Update voice profile for a user
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<Object>} - Updated profile data
 */
async function updateVoiceProfile(userId, profileData) {
  try {
    userVoiceProfiles[userId] = profileData;
    await saveUserProfile(userId, userVoiceProfiles[userId]);
    
    return userVoiceProfiles[userId]; // Ensure return is inside the function
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du profil vocal: ${error.message}`);
    throw new Error(`Impossible de mettre à jour le profil: ${error.message}`);
  }
}

module.exports = {
  textToNumber,
  processVoiceCommand,
  updateVoiceProfile,
};