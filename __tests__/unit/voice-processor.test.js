const voiceProcessor = require('../../modules/voice-processor');

// Mock du module de journalisation
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock du module d'utilitaires de base de données
jest.mock('../../utils/database-utils', () => ({
  findProductByName: jest.fn(name => {
    if (name.toLowerCase().includes('wine') || name.toLowerCase().includes('vin')) {
      return Promise.resolve({ name: 'Wine', unit: 'bottle' });
    }
    if (name.toLowerCase().includes('beer') || name.toLowerCase().includes('bière')) {
      return Promise.resolve({ name: 'Beer', unit: 'can' });
    }
    return Promise.resolve(null);
  }),
  saveInventoryItems: jest.fn(() => Promise.resolve({ success: true }))
}));

describe('Voice Processor Module', () => {
  // Test de la fonction processVoiceFile
  describe('processVoiceFile', () => {
    it('should process a voice file and return structured data', async () => {
      // Arrange
      const filePath = 'test-audio.wav';
      const location = 'boisson_maison';
      
      // Act
      const result = await voiceProcessor.processVoiceFile(filePath, location);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transcript).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.location).toBe(location);
    });
  });
  
  // Test de la fonction transcribeAudio
  describe('transcribeAudio', () => {
    it('should transcribe audio and return text with confidence', async () => {
      // Arrange
      const filePath = 'test-audio.wav';
      
      // Act
      const result = await voiceProcessor.transcribeAudio(filePath);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.transcript).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
  
  // Test de la fonction extractInventoryItems
  describe('extractInventoryItems', () => {
    it('should extract inventory items from transcript text', () => {
      // Arrange
      const transcript = 'five bottles of wine and three cans of beer';
      
      // Act
      const items = voiceProcessor.extractInventoryItems(transcript);
      
      // Assert
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual(expect.objectContaining({
        name: 'Wine',
        quantity: 5,
        unit: 'bottle'
      }));
      expect(items[1]).toEqual(expect.objectContaining({
        name: 'Beer',
        quantity: 3,
        unit: 'can'
      }));
    });
    
    it('should handle empty transcript', () => {
      // Arrange
      const transcript = '';
      
      // Act
      const items = voiceProcessor.extractInventoryItems(transcript);
      
      // Assert
      expect(items).toBeInstanceOf(Array);
      expect(items).toHaveLength(0);
    });
  });
  
  // Test de la fonction parseQuantity
  describe('Helper functions', () => {
    // Note: Ces fonctions sont privées dans le module, mais nous pouvons tester leur comportement indirectement
    it('should correctly parse quantity words in extractInventoryItems', () => {
      // Arrange
      const transcript = 'one bottle of wine and two cans of beer';
      
      // Act
      const items = voiceProcessor.extractInventoryItems(transcript);
      
      // Assert
      expect(items).toHaveLength(2);
      expect(items[0].quantity).toBe(1);
      expect(items[1].quantity).toBe(2);
    });
  });
});
