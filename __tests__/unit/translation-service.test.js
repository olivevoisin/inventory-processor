const translationService = require('../../modules/translation-service');

// Mock les dépendances
jest.mock('@google-cloud/translate', () => {
  return {
    v2: {
      Translate: jest.fn().mockImplementation(() => ({
        translate: jest.fn().mockImplementation((text, options) => {
          // Simuler la traduction français -> anglais
          const translations = {
            'vin': 'wine',
            'bière': 'beer',
            'bouteille': 'bottle',
            'cannette': 'can',
            'vodka': 'vodka',
            'boîte': 'box'
          };
          
          const textToTranslate = Array.isArray(text) ? text : [text];
          const translatedTexts = textToTranslate.map(t => {
            for (const [fr, en] of Object.entries(translations)) {
              if (t.toLowerCase().includes(fr)) {
                return t.toLowerCase().replace(fr, en);
              }
            }
            return t;
          });
          
          return [translatedTexts];
        })
      }))
    }
  };
});

describe('Module de traduction', () => {
  afterEach(() => {
    jest.clearAllMocks();
    translationService.clearCache();
  });
  
  test('translate devrait traduire correctement un texte', async () => {
    const result = await translationService.translate('vin rouge', 'fr', 'en');
    
    expect(result).toBeDefined();
    expect(result.toLowerCase()).toContain('wine');
  });
  
  test('batchTranslate devrait traduire correctement plusieurs textes', async () => {
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
    // Première traduction
    const result1 = await translationService.translate('vin rouge', 'fr', 'en');
    
    // Deuxième traduction (devrait utiliser le cache)
    const result2 = await translationService.translate('vin rouge', 'fr', 'en');
    
    expect(result1).toBe(result2);
  });
  
  test('translate devrait retourner le texte original si les langues source et cible sont identiques', async () => {
    const originalText = 'vin rouge';
    const result = await translationService.translate(originalText, 'fr', 'fr');
    
    expect(result).toBe(originalText);
  });
  
  test('batchTranslate devrait retourner un tableau vide pour un tableau vide', async () => {
    const result = await translationService.batchTranslate([], 'fr', 'en');
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
