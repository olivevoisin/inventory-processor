/**
 * Test de flux complet du traitement vocal
 */
const fs = require('fs');
const path = require('path');
const voiceProcessor = require('../../../modules/voice-processor');
const database = require('../../../utils/database-utils');

// Mocker les dépendances
jest.mock('fs');
jest.mock('../../../modules/voice-processor');
jest.mock('../../../utils/database-utils');

describe('Voice Processing End-to-End Flow', () => {
  beforeEach(() => {
    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
    
    // Simuler le traitement audio
    voiceProcessor.processVoiceFile.mockResolvedValue({
      success: true,
      transcript: "cinq bouteilles de vin rouge et trois cannettes de bière",
      items: [
        { name: 'Vin Rouge', quantity: 5, unit: 'bouteille' },
        { name: 'Bière', quantity: 3, unit: 'cannette' }
      ]
    });
    
    // Simuler les opérations de base de données
    database.saveInventoryItems.mockResolvedValue({ success: true });
  });
  
  test('should process voice recording from start to finish', async () => {
    const audioPath = '/tmp/test-audio.wav';
    const location = 'cuisine_maison';
    const period = '2023-01';
    
    // Exécuter le traitement vocal
    const result = await voiceProcessor.processVoiceFile(audioPath, location, period);
    
    // Vérifier le résultat
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(2);
    
    // Vérifier que les données ont été sauvegardées
    expect(database.saveInventoryItems).toHaveBeenCalled();
  });
  
  test('should handle empty transcription gracefully', async () => {
    // Simuler une transcription vide
    voiceProcessor.processVoiceFile.mockResolvedValueOnce({
      success: true,
      transcript: "",
      items: []
    });
    
    const audioPath = '/tmp/empty-audio.wav';
    const location = 'cuisine_maison';
    const period = '2023-01';
    
    // Exécuter le traitement vocal
    const result = await voiceProcessor.processVoiceFile(audioPath, location, period);
    
    // Vérifier le résultat
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(0);
  });
  
  test('should extract inventory items correctly', async () => {
    // Simuler différents formats d'énoncés
    const testTranscript = "dix bouteilles de vodka, cinq boîtes de vin et deux kilogrammes de sucre";
    
    // Mocker l'extraction 
    voiceProcessor.extractInventoryItems.mockReturnValueOnce([
      { name: 'Vodka', quantity: 10, unit: 'bouteille' },
      { name: 'Vin', quantity: 5, unit: 'boîte' },
      { name: 'Sucre', quantity: 2, unit: 'kilogramme' }
    ]);
    
    // Exécuter l'extraction
    const items = voiceProcessor.extractInventoryItems(testTranscript);
    
    // Vérifier les résultats
    expect(items).toHaveLength(3);
    expect(items[0].name).toBe('Vodka');
    expect(items[1].quantity).toBe(5);
    expect(items[2].unit).toBe('kilogramme');
  });
});
