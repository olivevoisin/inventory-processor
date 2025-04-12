/**
 * Traducteur simulé pour les tests
 */
function mockTranslate(text, sourceLanguage, targetLanguage) {
  // Dictionnaire de traduction pour les termes japonais courants
  const jaToFr = {
    'ウォッカ グレイグース': 'Vodka Grey Goose',
    'ワイン カベルネ': 'Vin Cabernet',
    'ジン ボンベイ': 'Gin Bombay'
  };
  
  // Traduire les termes japonais vers le français
  if (sourceLanguage === 'ja' && targetLanguage === 'fr') {
    return jaToFr[text] || `Traduit: ${text}`;
  }
  
  // Par défaut, retourner le texte original
  return text;
}

module.exports = {
  mockTranslate
};
