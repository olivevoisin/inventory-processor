// Test du service de traduction
const translationService = require('./modules/translation-service');

async function testTranslation() {
  console.log("=== Test du service de traduction ===");
  
  // Test de traduction simple
  try {
    const original = "ウォッカ グレイグース";
    console.log("Texte original:", original);
    
    const translated = await translationService.translate(original, 'ja', 'fr');
    console.log("Texte traduit:", translated);
    
    // Test de traduction par lot
    const items = [
      "ワイン カベルネ",
      "ジン ボンベイ",
      "ウイスキー ジャック ダニエル"
    ];
    
    console.log("\nTest de traduction par lot:");
    console.log("Textes originaux:", items);
    
    const translatedItems = await translationService.batchTranslate(items, 'ja', 'fr');
    console.log("Textes traduits:", translatedItems);
    
    console.log("\nTest de détection de langue:");
    const detectedLanguage = await translationService.detectLanguage("お酒のインベントリー");
    console.log("Langue détectée:", detectedLanguage);
    
  } catch (error) {
    console.error("Erreur de test:", error.message);
  }
  
  console.log("=== Fin du test ===");
}

testTranslation();
