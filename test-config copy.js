// Test de la configuration
const config = require('./config');

console.log("=== Test de configuration ===");
console.log("Port:", config.port);
console.log("Emplacement des uploads:", config.uploads ? config.uploads.voiceDir : 'Non défini');
console.log("Localisations:", config.voiceProcessing ? config.voiceProcessing.locations : 'Non défini');
console.log("Intégration Google Sheets:", config.googleSheets && config.googleSheets.enabled ? "Activée" : "Désactivée");
console.log("=== Fin du test ===");
