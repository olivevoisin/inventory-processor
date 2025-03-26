module.exports = {
  Deepgram: jest.fn().mockImplementation(() => ({
    transcription: {
      preRecorded: jest.fn().mockImplementation(() => ({
        transcribe: jest.fn().mockResolvedValue({
          results: {
            channels: [{
              alternatives: [{
                transcript: "five bottles of wine and three cans of beer",
                confidence: 0.95
              }]
            }]
          }
        })
      }))
    }
  }))
};
