/**
 * Test du workflow de reconnaissance vocale
 */
const voiceProcessor = require('../../../modules/voice-processor');
const voiceWorkflow = require('../../../modules/voice-workflow');
const databaseUtils = require('../../../utils/database-utils');

// Mocker les dépendances
jest.mock('../../../modules/voice-processor');
jest.mock('../../../utils/database-utils');

describe('Voice Recognition and Inventory Update Workflow', () => {
  beforeEach(() => {
    // Réinitialiser les mocks
    jest.clearAllMocks();
    
    // Par défaut, simuler une reconnaissance réussie
    voiceProcessor.processAudio.mockResolvedValue({
      transcript: '5 bottles of wine and 3 cans of beer',
      confidence: 0.95,
      items: [
        { name: 'Wine', quantity: 5, unit: 'bottle' },
        { name: 'Beer', quantity: 3, unit: 'can' }
      ]
    });
    
    // Simuler la recherche de produits dans la base de données
    databaseUtils.findProductByName.mockImplementation((name) => {
      if (name === 'Wine') {
        return { id: 1, name: 'Wine', unit: 'bottle' };
      }
      return null; // Simuler un produit non trouvé
    });
    
    // Simuler la sauvegarde dans la base de données
    databaseUtils.saveInventoryItems.mockResolvedValue({ success: true });
  });
  
  test('complete voice recognition workflow processes audio to inventory updates', async () => {
    // Exécuter le workflow
    const result = await voiceWorkflow.processVoiceRecording('test-audio.wav', 'Bar');
    
    // Vérifier les résultats
    expect(result.success).toBe(true);
    expect(result.transcript).toBe('5 bottles of wine and 3 cans of beer');
    expect(result.items).toHaveLength(2);
    
    // Vérifier que le processus a été appelé
    expect(voiceProcessor.processAudio).toHaveBeenCalledWith('test-audio.wav', 'Bar');
    
    // Vérifier que la mise à jour de l'inventaire a été effectuée
    expect(databaseUtils.saveInventoryItems).toHaveBeenCalled();
  });
  
  test('handles unknown products gracefully', async () => {
    // Simuler aucun produit trouvé
    databaseUtils.findProductByName.mockResolvedValue(null);
    
    // Exécuter le workflow
    const result = await voiceWorkflow.processVoiceRecording('test-audio.wav', 'Bar');
    
    // Vérifier que le workflow continue malgré des produits inconnus
    expect(result.success).toBe(true);
    expect(databaseUtils.saveInventoryItems).toHaveBeenCalled();
  });
  
  test('handles transcription errors gracefully', async () => {
    // Simuler une erreur de transcription
    voiceProcessor.processAudio.mockRejectedValue(new Error('Transcription failed'));
    
    // Exécuter le workflow et attendre une erreur
    await expect(
      voiceWorkflow.processVoiceRecording('error.wav', 'Bar')
    ).rejects.toThrow('Transcription failed');
    
    // Vérifier que la mise à jour de l'inventaire n'a pas été tentée
    expect(databaseUtils.saveInventoryItems).not.toHaveBeenCalled();
  });
  
  test('handles empty transcripts gracefully', async () => {
    // Simuler une transcription vide
    voiceProcessor.processAudio.mockResolvedValue({
      transcript: '',
      confidence: 0,
      items: []
    });
    
    // Exécuter le workflow
    const result = await voiceWorkflow.processVoiceRecording('empty.wav', 'Bar');
    
    // Vérifier que le workflow gère correctement les transcriptions vides
    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(0);
    expect(result).toHaveProperty('warning');
    expect(databaseUtils.saveInventoryItems).not.toHaveBeenCalled();
  });
});
