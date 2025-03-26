// Configuration globale pour les tests
beforeAll(() => {
  // Configurer les variables d'environnement pour les tests
  process.env.NODE_ENV = 'test';
  
  // Valeurs simulées pour les clés API et autres configurations
  process.env.API_KEY = 'test-api-key';
  process.env.GOOGLE_SHEETS_DOC_ID = 'test-sheet-id';
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL = 'test@example.com';
  process.env.GOOGLE_SHEETS_PRIVATE_KEY = 'test-private-key';
  process.env.DEEPGRAM_API_KEY = 'test-deepgram-key';
  process.env.GOOGLE_TRANSLATE_API_KEY = 'test-translate-key';
  
  // Augmenter le timeout pour les tests
  jest.setTimeout(10000);
});

// Nettoyer après tous les tests
afterAll(() => {
  // Nettoyage global
});
