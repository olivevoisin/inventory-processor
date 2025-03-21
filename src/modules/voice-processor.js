/**
 * Voice Processor Module
 * Handles processing of voice recordings for inventory management
 */
const fs = require('fs').promises;
const path = require('path');
const { Deepgram } = require('@deepgram/sdk');
const logger = require('../utils/logger');
const databaseUtils = require('../utils/database-utils');
const { ExternalServiceError } = require('../utils/error-handler');
const config = require('../config');

// Create Deepgram client
const deepgramApiKey = config.deepgram?.apiKey || process.env.DEEPGRAM_API_KEY;
const deepgram = new Deepgram(deepgramApiKey);

// Map of words to numbers for text-to-number conversion
const wordToNumber = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
  'eighty': 80, 'ninety': 90, 'hundred': 100
};

/**
 * Process a voice file for inventory counting
 * @param {string} filePath - Path to the voice file
 * @returns {Promise<Object>} - Processing results
 */
async function processVoiceFile(filePath) {
  try {
    logger.info(`Processing voice file: ${filePath}`);
    
    // Read audio file
    const audioData = await fs.readFile(filePath);
    
    // Transcribe audio
    const transcript = await transcribeAudio(audioData);
    
    // Extract inventory items from transcript
    const items = await extractInventoryData(transcript);
    
    return {
      success: true,
      transcript,
      items: items.items || [],
      source: 'voice',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error processing voice file: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract inventory data from transcript
 * @param {string} transcript - Transcribed text
 * @returns {Promise<Object>} - Extracted inventory data
 */
async function extractInventoryData(transcript) {
  if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
    return { 
      success: true,
      items: [],
      source: 'voice',
      timestamp: new Date().toISOString()
    };
  }
  
  try {
    // Common patterns for inventory counting
    // Example formats:
    // "Add 5 units of SKU-123 to shelf A"
    // "5 bottles of wine"
    // "3 cans of beer"
    const words = transcript.toLowerCase().split(/\s+/);
    const items = [];
    
    // Look for SKU pattern: "Add X units of SKU-Y"
    const skuMatch = transcript.match(/(\d+)\s+units\s+of\s+(SKU-\d+)/i);
    if (skuMatch) {
      items.push({
        sku: skuMatch[2],
        quantity: parseInt(skuMatch[1], 10),
        location: transcript.includes('shelf') ? 
          transcript.match(/shelf\s+([A-Z]\d*)/i)?.[1] : '',
      });
    } else {
      // Look for product pattern: "X units/bottles/cans of Y"
      for (let i = 0; i < words.length; i++) {
        let quantity = null;
        let unit = null;
        let productName = null;
        
        // Try to find quantity
        if (/^\d+$/.test(words[i])) {
          // Numeric quantity
          quantity = parseInt(words[i], 10);
        } else if (wordToNumber[words[i]]) {
          // Word quantity
          quantity = wordToNumber[words[i]];
        }
        
        if (quantity && i + 3 < words.length) {
          // Look for pattern: [quantity] [unit] of [product]
          unit = words[i + 1];
          if (words[i + 2] === 'of' && words[i + 3]) {
            productName = words[i + 3];
            
            items.push({
              name: productName,
              quantity,
              unit,
            });
            
            // Skip processed words
            i += 3;
          }
        }
      }
    }
    
    return {
      success: true,
      items,
      source: 'voice',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Error extracting inventory data: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Transcribe audio data using Deepgram API
 * @param {Buffer} audioData - Audio data as buffer
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioData) {
  try {
    // Detect audio format (simplified for example)
    const mimetype = 'audio/wav'; // In a real implementation, this would detect the actual format
    
    // Send to Deepgram for transcription
    const response = await deepgram.transcription.preRecorded({
      buffer: audioData,
      mimetype
    }, {
      punctuate: true,
      language: 'en-US',
      model: 'nova-2'
    }).transcribe();
    
    // Get transcript from response
    if (response?.results?.channels[0]?.alternatives[0]?.transcript) {
      return response.results.channels[0].alternatives[0].transcript;
    }
    
    return '';
  } catch (error) {
    logger.error(`Transcription error: ${error.message}`);
    throw new ExternalServiceError('Deepgram', `Transcription failed: ${error.message}`);
  }
}

/**
 * Process audio file (compatibility function)
 */
async function processAudio(filePath) {
  return processVoiceFile(filePath);
}

/**
 * Extract inventory items (compatibility function)
 */
async function extractInventoryItems(transcript) {
  const result = await extractInventoryData(transcript);
  return result.items || [];
}

/**
 * Convert text representation of a number to numeric value
 * @param {string} text - Text to convert
 * @returns {number} - Numeric value
 */
function textToNumber(text) {
  if (!text) return 1;
  
  // If it's already a number, return it
  if (/^\d+$/.test(text)) {
    return parseInt(text, 10);
  }
  
  // Check if it's a word number
  if (wordToNumber[text.toLowerCase()]) {
    return wordToNumber[text.toLowerCase()];
  }
  
  // Default to 1 if not recognized
  return 1;
}

module.exports = {
  processVoiceFile,
  extractInventoryData,
  transcribeAudio,
  textToNumber,
  // For compatibility
  processAudio,
  extractInventoryItems,
  // For testing
  deepgram,
  deepgramApiKey,
  language: 'en-US',
  model: 'nova-2'
};
