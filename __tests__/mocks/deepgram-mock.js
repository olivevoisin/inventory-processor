// Mock for Deepgram API
module.exports = {
  transcription: {
    preRecorded: jest.fn().mockReturnValue({
      transcribe: jest.fn().mockResolvedValue({
        results: {
          channels: [{
            alternatives: [{
              transcript: "10 bottles of vodka and 5 boxes of wine",
              confidence: 0.95
            }]
          }]
        }
      })
    })
  }
};
