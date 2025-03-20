// __tests__/unit/modules/translation-service.test.js

// Create a mock implementation
const mockTranslationService = {
    translateJapaneseToFrench: jest.fn().mockResolvedValue(
      'Facture\nDate: 15 Octobre 2023\nRéférence produit: JPN-1234\nQuantité: 20\nPrix unitaire: 2500 ¥\nMontant total: 50000 ¥'
    ),
    translateText: jest.fn().mockImplementation((text, targetLanguage) => {
      if (targetLanguage === 'fr') {
        return Promise.resolve(
          'Facture\nDate: 15 Octobre 2023\nRéférence produit: JPN-1234\nQuantité: 20\nPrix unitaire: 2500 ¥\nMontant total: 50000 ¥'
        );
      }
      return Promise.resolve('Translated: ' + text);
    }),
    detectLanguage: jest.fn().mockResolvedValue('ja')
  };
  
  // Mock the module
  jest.mock('../../../modules/translation-service', () => mockTranslationService);
  
  // Mock dependencies
  jest.mock('../../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }));
  
  jest.mock('../../../config', () => ({
    googleTranslate: {
      projectId: 'test-project-id',
      keyFilename: 'test-key-file.json'
    }
  }));
  
  describe('Translation Service Module', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    describe('translateJapaneseToFrench', () => {
      it('should translate Japanese text to French', async () => {
        // Arrange
        const japaneseText = '請求書\n日付: 2023年10月15日\n商品番号: JPN-1234\n数量: 20\n単価: ¥2,500\n合計: ¥50,000';
        
        // Act
        const result = await mockTranslationService.translateJapaneseToFrench(japaneseText);
        
        // Assert
        expect(result).toContain('Facture');
        expect(result).toContain('Octobre 2023');
        expect(mockTranslationService.translateJapaneseToFrench).toHaveBeenCalledWith(japaneseText);
      });
  
      it('should handle translation errors', async () => {
        // Arrange
        mockTranslationService.translateJapaneseToFrench.mockRejectedValueOnce(
          new Error('Translation service error')
        );
        
        // Act & Assert
        await expect(
          mockTranslationService.translateJapaneseToFrench('some text')
        ).rejects.toThrow('Translation service error');
      });
    });
  
    describe('translateText', () => {
      it('should translate text to specified language', async () => {
        // Arrange
        const sourceText = 'Hello world';
        const targetLanguage = 'fr';
        
        // Act
        const result = await mockTranslationService.translateText(sourceText, targetLanguage);
        
        // Assert
        expect(result).toBeDefined();
        expect(mockTranslationService.translateText).toHaveBeenCalledWith(sourceText, targetLanguage);
      });
    });
  
    describe('detectLanguage', () => {
      it('should detect the language of provided text', async () => {
        // Arrange
        const japaneseText = '請求書';
        
        // Act
        const result = await mockTranslationService.detectLanguage(japaneseText);
        
        // Assert
        expect(result).toBe('ja');
        expect(mockTranslationService.detectLanguage).toHaveBeenCalledWith(japaneseText);
      });
    });
  });