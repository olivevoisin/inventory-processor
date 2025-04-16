const translationService = require('../../modules/translation-service');

// Mock les dépendances
jest.mock('@google-cloud/translate', () => ({
  v2: {
    Translate: jest.fn().mockImplementation(() => ({
      translate: jest.fn().mockResolvedValue(['translated']),
      detect: jest.fn().mockResolvedValue([{ language: 'en' }])
    }))
  }
}), { virtual: true });

describe('Module de traduction', () => {
  afterEach(() => {
    jest.clearAllMocks();
    translationService.clearCache();
  });
  
  test('translate devrait traduire correctement un texte', async () => {
    if (process.env.SKIP_AUTH === 'true') return;

    const result = await translationService.translate('vin rouge', 'fr', 'en');
    
    expect(result).toBeDefined();
    expect(result.toLowerCase()).toContain('wine');
  });
  
  test('batchTranslate devrait traduire correctement plusieurs textes', async () => {
    if (process.env.SKIP_AUTH === 'true') return;

    const texts = [
      'bouteille de vin',
      'cannette de bière',
      'boîte de chocolat'
    ];
    
    const results = await translationService.batchTranslate(texts, 'fr', 'en');
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);
    
    expect(results[0].toLowerCase()).toContain('bottle');
    expect(results[0].toLowerCase()).toContain('wine');
    
    expect(results[1].toLowerCase()).toContain('can');
    expect(results[1].toLowerCase()).toContain('beer');
    
    expect(results[2].toLowerCase()).toContain('box');
  });
  
  test('translate devrait utiliser le cache pour des traductions répétées', async () => {
    if (process.env.SKIP_AUTH === 'true') return;

    // Première traduction
    const result1 = await translationService.translate('vin rouge', 'fr', 'en');
    
    // Deuxième traduction (devrait utiliser le cache)
    const result2 = await translationService.translate('vin rouge', 'fr', 'en');
    
    expect(result1).toBe(result2);
  });
  
  test('translate devrait retourner le texte original si les langues source et cible sont identiques', async () => {
    if (process.env.SKIP_AUTH === 'true') return;

    const originalText = 'vin rouge';
    const result = await translationService.translate(originalText, 'fr', 'fr');
    
    expect(result).toBe(originalText);
  });
  
  test('batchTranslate devrait retourner un tableau vide pour un tableau vide', async () => {
    if (process.env.SKIP_AUTH === 'true') return;

    const result = await translationService.batchTranslate([], 'fr', 'en');
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
