module.exports = {
  v2: {
    Translate: function() {
      return {
        translate: jest.fn().mockImplementation((text, targetLanguage) => {
          // Simple mock that prefixes "Translated:" to the text
          if (Array.isArray(text)) {
            return [text.map(t => `Translated: ${t}`)];
          }
          return [`Translated: ${text}`];
        }),
        detect: jest.fn().mockResolvedValue([{ language: 'ja' }])
      };
    }
  }
};
