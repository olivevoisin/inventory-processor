const { Deepgram } = require('@deepgram/sdk');
const dbUtils = require('../utils/database-utils');

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
const deepgram = new Deepgram(deepgramApiKey);

const logger = require('../utils/logger');

/**
 * Process audio file using Deepgram
 * @param {Buffer} audioBuffer - The audio file buffer
 * @return {Object} Transcription result
 */
async function processAudio(audioBuffer) {
  console.log(`Processing audio with size: ${audioBuffer.length} bytes`);

  const source = {
    buffer: audioBuffer,
  };

  const options = {
    punctuate: true,
    model: 'nova',
    diarize: false,
    smart_format: true,
    numerals: true
  };

  try {
    console.log('Sending request to Deepgram...');
    const result = await deepgram.transcription.preRecorded(source, options);
    console.log('Received response from Deepgram.');
    
    // Log some metadata about the transcription
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    console.log(`Transcript length: ${transcript.length} characters`);
    console.log(`Transcript preview: ${transcript.substring(0, 100)}...`);
    
    return result;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio: ' + error.message);
  }
}

/**
 * Extract inventory items from transcription
 * @param {Object} transcription - The Deepgram transcription result
 * @return {Array} Array of inventory items with confidence scores
 */
async function extractInventoryItems(transcription) {
  try {
    // Get the transcript text
    const transcript = transcription.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    
    if (!transcript) {
      console.warn('No transcript found in the transcription result');
      return [];
    }
    
    console.log(`Extracting inventory items from transcript: ${transcript.length} chars`);
    
    // Define regex patterns for common inventory phrases
    const quantityPattern = /(\d+)\s+(pieces|units|boxes|items|cases|pallets|dozen|packets|bag|bags)/gi;
    const productPattern = /(add|update|count|inventory|stock|have|need|order|check|get|put)\s+([a-z0-9\s]+)/gi;
    
    // Extract potential inventory actions
    const items = [];
    
    // Process quantity mentions
    let quantityMatch;
    while ((quantityMatch = quantityPattern.exec(transcript)) !== null) {
      const quantity = parseInt(quantityMatch[1]);
      const unit = quantityMatch[2];
      
      // Look for product mentions near this quantity
      const surroundingText = transcript.substring(
        Math.max(0, quantityMatch.index - 50),
        Math.min(transcript.length, quantityMatch.index + quantityMatch[0].length + 50)
      );
      
      console.log(`Found quantity: ${quantity} ${unit}, analyzing context: "${surroundingText}"`);
      
      // Try to identify products from the surrounding text
      const productCandidates = await findProductMatches(surroundingText);
      
      if (productCandidates.length > 0) {
        // Use the best match
        const bestMatch = productCandidates[0];
        items.push({
          productId: bestMatch.productId,
          productName: bestMatch.productName,
          quantity: quantity,
          confidence: bestMatch.confidence
        });
        
        console.log(`Matched product: ${bestMatch.productName} with confidence ${bestMatch.confidence}`);
      } else {
        console.log(`No product matches found for context: "${surroundingText}"`);
      }
    }
    
    // Look for direct product mentions
    let productMatch;
    while ((productMatch = productPattern.exec(transcript)) !== null) {
      const action = productMatch[1];
      const productText = productMatch[2].trim();
      
      // Skip if too short
      if (productText.length < 3) continue;
      
      // Look for quantities nearby
      const surroundingText = transcript.substring(
        Math.max(0, productMatch.index - 20),
        Math.min(transcript.length, productMatch.index + productMatch[0].length + 30)
      );
      
      // Try to extract a quantity
      let quantity = 1; // Default quantity
      const quantitySearch = /(\d+)/g;
      let quantityFound = false;
      let qMatch;
      
      while ((qMatch = quantitySearch.exec(surroundingText)) !== null) {
        quantity = parseInt(qMatch[1]);
        quantityFound = true;
        break;
      }
      
      // Try to identify products
      const productCandidates = await findProductMatches(productText);
      
      if (productCandidates.length > 0 && productCandidates[0].confidence > 0.4) {
        const bestMatch = productCandidates[0];
        
        // Check if this product is already in items list
        const existingItem = items.find(item => item.productId === bestMatch.productId);
        
        if (existingItem) {
          // Update existing item if this match has higher confidence
          if (bestMatch.confidence > existingItem.confidence) {
            existingItem.confidence = bestMatch.confidence;
            if (quantityFound) {
              existingItem.quantity = quantity;
            }
          }
        } else {
          // Add new item
          items.push({
            productId: bestMatch.productId,
            productName: bestMatch.productName,
            quantity: quantity,
            confidence: bestMatch.confidence
          });
          
          console.log(`Found product mention: ${bestMatch.productName}, qty: ${quantity}, confidence: ${bestMatch.confidence}`);
        }
      }
    }
    
    // If no items found, try more aggressive pattern matching
    if (items.length === 0) {
      console.log('No items found with primary patterns, trying fallback approach');
      const words = transcript.split(/\s+/);
      
      // Get all products
      const allProducts = await dbUtils.getAllProducts();
      
      for (const product of allProducts) {
        const productName = product.name.toLowerCase();
        const productWords = productName.split(/\s+/).filter(word => word.length > 3);
        
        // Count how many product words appear in the transcript
        let matchCount = 0;
        for (const productWord of productWords) {
          if (transcript.toLowerCase().includes(productWord)) {
            matchCount++;
          }
        }
        
        // Calculate confidence
        if (productWords.length > 0 && matchCount > 0) {
          const confidence = (matchCount / productWords.length) * 0.6; // Lower base confidence
          
          if (confidence > 0.3) { // Lower threshold
            // Try to find a quantity near this product mention
            const productIndex = transcript.toLowerCase().indexOf(productWords[0]);
            if (productIndex >= 0) {
              const surroundingText = transcript.substring(
                Math.max(0, productIndex - 20),
                Math.min(transcript.length, productIndex + 50)
              );
              
              // Try to extract a quantity
              let quantity = 1; // Default quantity
              const quantitySearch = /(\d+)/g;
              let qMatch;
              
              while ((qMatch = quantitySearch.exec(surroundingText)) !== null) {
                quantity = parseInt(qMatch[1]);
                break;
              }
              
              items.push({
                productId: product.id,
                productName: product.name,
                quantity: quantity,
                confidence: confidence
              });
              
              console.log(`Fallback match: ${product.name}, qty: ${quantity}, confidence: ${confidence}`);
            }
          }
        }
      }
    }
    
    console.log(`Extracted ${items.length} inventory items from transcript`);
    return items;
  } catch (error) {
    console.error('Error extracting inventory items:', error);
    return [];
  }
}

/**
 * Find product matches in the database
 * @param {string} text - The text to search for product mentions
 * @return {Array} Array of matching products with confidence scores
 */
async function findProductMatches(text) {
  try {
    // Get all products from database
    const products = await dbUtils.getAllProducts();
    
    console.log(`Finding matches for "${text}" among ${products.length} products`);
    
    // Calculate match scores for each product
    const matches = products.map(product => {
      // Simple string similarity scoring
      const productNameLower = product.name.toLowerCase();
      const textLower = text.toLowerCase();
      
      // Check for exact product name
      if (textLower.includes(productNameLower)) {
        return {
          productId: product.id,
          productName: product.name,
          confidence: 0.9 // High confidence for exact matches
        };
      }
      
      // Check for partial product name matches
      const words = productNameLower.split(/\s+/).filter(word => word.length > 3);
      let matchCount = 0;
      let totalWordLength = 0;
      let matchedWordLength = 0;
      
      words.forEach(word => {
        totalWordLength += word.length;
        if (textLower.includes(word)) {
          matchCount++;
          matchedWordLength += word.length;
        }
      });
      
      // Calculate confidence based on both word count and character length
      let wordCountConfidence = words.length > 0 ? (matchCount / words.length) * 0.7 : 0;
      let wordLengthConfidence = totalWordLength > 0 ? (matchedWordLength / totalWordLength) * 0.7 : 0;
      
      // Combine both confidence scores
      const confidence = Math.max(wordCountConfidence, wordLengthConfidence);
      
      return {
        productId: product.id,
        productName: product.name,
        confidence: confidence
      };
    });
    
    // Filter and sort matches by confidence
    const filteredMatches = matches
      .filter(match => match.confidence > 0.2) // Only include matches with some confidence
      .sort((a, b) => b.confidence - a.confidence); // Sort by descending confidence
    
    if (filteredMatches.length > 0) {
      console.log(`Best match: "${filteredMatches[0].productName}" with confidence ${filteredMatches[0].confidence}`);
    } else {
      console.log(`No good matches found for "${text}"`);
    }
    
    return filteredMatches;
  } catch (error) {
    console.error('Error finding product matches:', error);
    return [];
  }
}

module.exports = {
  processAudio,
  extractInventoryItems
};