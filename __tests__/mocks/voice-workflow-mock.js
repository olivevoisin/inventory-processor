/**
 * Voice Workflow Mock pour les tests
 */

// Mock functions for testing
const processVoiceRecording = jest.fn().mockImplementation((filePath, location) => {
  if (filePath.includes('error') || filePath.includes('failing')) {
    throw new Error('Transcription failed');
  }
  
  if (filePath.includes('empty')) {
    return {
      success: true,
      transcript: '',
      confidence: 0,
      items: [],
      warning: 'Empty transcript'
    };
  }
  
  return {
    success: true,
    transcript: 'five bottles of wine and three cans of beer',
    confidence: 0.95,
    items: [
      { name: 'Wine', quantity: 5, unit: 'bottle' },
      { name: 'Beer', quantity: 3, unit: 'can' }
    ],
    location
  };
});

const processVoiceDirectory = jest.fn().mockImplementation((directory, location) => {
  if (directory.includes('empty')) {
    return { success: true, processed: 0, message: 'No files found' };
  }
  
  return {
    success: true,
    processed: 2,
    errors: 0,
    items: [
      { name: 'Wine', quantity: 5, unit: 'bottle' },
      { name: 'Beer', quantity: 3, unit: 'can' }
    ]
  };
});

module.exports = {
  processVoiceRecording,
  processVoiceDirectory
};
