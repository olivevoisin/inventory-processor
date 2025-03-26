// Mock pour le service Deepgram
const deepgramMock = {
  transcription: {
    preRecorded: jest.fn().mockImplementation(() => ({
      transcribe: jest.fn().mockResolvedValue({
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: "cinq bouteilles de vin rouge et trois cannettes de bière blonde",
                  confidence: 0.95
                }
              ]
            }
          ]
        }
      })
    }))
  }
};

module.exports = deepgramMock;
