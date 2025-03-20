// __tests__/mocks/deepgram.js
const fs = require('fs');
const path = require('path');

/**
 * Mock implementation of the Deepgram voice processing service
 */
const deepgramMock = {
  // Mock transcription method
  transcribeAudio: jest.fn().mockImplementation(async (audioData, options = {}) => {
    // For testing, we'll return different results based on the audio content
    // This allows tests to simulate different scenarios
    
    // Convert buffer to string for simple pattern matching
    const audioString = Buffer.isBuffer(audioData) 
      ? audioData.toString('utf8').substring(0, 100) // Just check start of buffer
      : String(audioData).substring(0, 100);
    
    // Check for error trigger patterns
    if (audioString.includes('ERROR') || audioString.includes('FAIL')) {
      throw new Error('Deepgram transcription failed');
    }
    
    // Load appropriate mock response based on audio content
    let mockResponseFile = 'default-transcription.json';
    
    if (audioString.includes('INVENTORY')) {
      mockResponseFile = 'inventory-transcription.json';
    } else if (audioString.includes('ORDER')) {
      mockResponseFile = 'order-transcription.json';
    } else if (audioString.includes('INVOICE')) {
      mockResponseFile = 'invoice-transcription.json';
    }
    
    // Try to load the mock response file
    try {
      const mockResponse = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../fixtures/unit/voice-processor', mockResponseFile),
          'utf8'
        )
      );
      
      // Add any custom options that were passed to the mock
      return {
        ...mockResponse,
        requestOptions: options
      };
    } catch (error) {
      // If file not found, return a generic response
      return {
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: "This is a mock transcription response. The actual content would depend on the audio file.",
                  confidence: 0.95
                }
              ]
            }
          ]
        },
        metadata: {
          transaction_key: "mock-transaction-" + Date.now(),
          request_id: "mock-request-" + Date.now(),
          sha256: "mock-sha256",
          created: new Date().toISOString(),
          duration: 10.5,
          channels: 1
        }
      };
    }
  }),
  
  // Mock method for speech analysis
  analyzeSpeech: jest.fn().mockImplementation(async (audioData, options = {}) => {
    // Similar pattern to transcription but for analysis
    // This would return things like speaker diarization, sentiment, etc.
    return {
      analysis: {
        sentiment: {
          overall: "positive",
          score: 0.75
        },
        topics: [
          { topic: "inventory", confidence: 0.85 },
          { topic: "orders", confidence: 0.65 }
        ],
        speakers: [
          { speaker: 0, confidence: 0.92 }
        ]
      },
      metadata: {
        transaction_key: "mock-analysis-" + Date.now(),
        request_id: "mock-request-" + Date.now(),
        created: new Date().toISOString()
      }
    };
  })
};

module.exports = deepgramMock;