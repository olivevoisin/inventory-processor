const translationService = require('../../modules/translation-service');

describe('Module de traduction', () => {
  beforeEach(() => {
    // Vider le cache avant chaque test
    translationService.clearCache();
  });
  
  test('translate devrait traduire correctement un texte', async () => {
    const result = await translationService.translate('vin rouge', 'fr', 'en');
    
    expect(result).toBeDefined();
    expect(result.toLowerCase()).toContain('wine');
  });
  
  test('batchTranslate devrait traduire correctement plusieurs textes', async () => {
    const textsToTranslate = [
      'bouteille de vin',
      'cannette de bière',
      'boîte de chocolat'
    ];
    
    const results = await translationService.batchTranslate(textsToTranslate, 'fr', 'en');
    
    expect(results).toBeDefined();
    expect(results.length).toBe(3);
    
    expect(results[0].toLowerCase()).toContain('bottle');
    expect(results[0].toLowerCase()).toContain('wine');
    
    expect(results[1].toLowerCase()).toContain('can');
    expect(results[1].toLowerCase()).toContain('beer');
    
    expect(results[2].toLowerCase()).toContain('box');
    expect(results[2].toLowerCase()).toContain('chocolate');
  });
  
  test('translate devrait utiliser le cache pour des traductions répétées', async () => {
    // Première traduction
    const result1 = await translationService.translate('vin rouge', 'fr', 'en');
    
    // Deuxième traduction (devrait utiliser le cache)
    const result2 = await translationService.translate('vin rouge', 'fr', 'en');
    
    expect(result1).toBe(result2);
    expect(result1.toLowerCase()).toContain('wine');
  });
  
  test('translate devrait retourner le texte original si les langues source et cible sont identiques', async () => {
    const originalText = 'vin rouge';
    const result = await translationService.translate(originalText, 'fr', 'fr');
    
    expect(result).toBe(originalText);
  });
  
  test('batchTranslate devrait retourner un tableau vide pour un tableau vide', async () => {
    const result = await translationService.batchTranslate([], 'fr', 'en');
    
    expect(result).toEqual([]);
  });
});
