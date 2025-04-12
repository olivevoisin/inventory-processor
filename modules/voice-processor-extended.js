/**
 * Module de traitement vocal étendu
 * Gère la reconnaissance vocale en français et l'interaction avec la base de données de produits
 */
const fs = require('fs').promises;
const path = require('path');
const { Deepgram } = require('@deepgram/sdk');
const logger = require('../utils/logger');
const databaseUtils = require('../utils/database-utils-extended');
const { ExternalServiceError } = require('../utils/error-handler');
const config = require('../config');

// Créer le client Deepgram
const deepgramApiKey = config.voiceProcessing?.deepgramApiKey || process.env.DEEPGRAM_API_KEY;
const deepgram = new Deepgram(deepgramApiKey);

// Sessions actives
const activeSessions = new Map();

// Dictionnaire pour la conversion de mots en nombres
const motVersNombre = {
  'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
  'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
  'onze': 11, 'douze': 12, 'treize': 13, 'quatorze': 14, 'quinze': 15,
  'seize': 16, 'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19, 'vingt': 20,
  'trente': 30, 'quarante': 40, 'cinquante': 50, 'soixante': 60, 
  'soixante-dix': 70, 'quatre-vingt': 80, 'quatre-vingt-dix': 90, 'cent': 100
};

/**
 * Traite un fichier audio pour l'inventaire
 * @param {string} filePath - Chemin vers le fichier audio
 * @param {string} location - Emplacement de l'inventaire
 * @param {string} period - Période d'inventaire (format YYYY-MM)
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Résultats du traitement
 */
async function processVoiceFile(filePath, location, period, userId = 'anonymous') {
  try {
    logger.info(`Traitement du fichier audio: ${filePath} pour l'emplacement: ${location}, période: ${period}`);
    
    // Validation des paramètres
    if (!location) {
      throw new Error('Emplacement requis');
    }
    
    if (!period) {
      // Utiliser le mois courant si non spécifié
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // Lire le fichier audio
    const audioData = await fs.readFile(filePath);
    
    // Transcrire l'audio
    const transcription = await transcribeAudio(audioData);
    
    // Extraire les éléments d'inventaire à partir de la transcription
    const items = await extractInventoryItems(transcription, location);
    
    // Préparer les résultats
    const results = {
      success: true,
      transcript: transcription,
      location: location,
      period: period,
      userId: userId,
      items: items,
      recognizedItemsCount: items.filter(item => !item.needsReview).length,
      unrecognizedItemsCount: items.filter(item => item.needsReview).length,
      timestamp: new Date().toISOString()
    };
    
    // Sauvegarder les résultats dans la base de données
    if (items.length > 0) {
      try {
        await databaseUtils.saveInventoryItems(items, location, period);
        results.savedToDatabase = true;
      } catch (saveError) {
        logger.error(`Erreur lors de la sauvegarde de l'inventaire: ${saveError.message}`);
        results.saveError = saveError.message;
        results.savedToDatabase = false;
      }
    }
    
    return results;
  } catch (error) {
    logger.error(`Erreur lors du traitement du fichier audio: ${error.message}`);
    throw new ExternalServiceError('Voice Processing', error.message);
  }
}

/**
 * Démarre une session interactive de reconnaissance vocale
 * @param {string} location - Emplacement de l'inventaire
 * @param {string} period - Période d'inventaire
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Informations de session
 */
async function startInteractiveSession(location, period, userId = 'anonymous') {
  try {
    logger.info(`Démarrage d'une session interactive pour l'emplacement: ${location}, période: ${period}, utilisateur: ${userId}`);
    
    // Validation des paramètres
    if (!location) {
      throw new Error('Emplacement requis');
    }
    
    if (!period) {
      // Utiliser le mois courant si non spécifié
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // Créer un ID de session
    const sessionId = `session_${Date.now()}_${userId}`;
    
    // Créer une nouvelle session
    const session = {
      id: sessionId,
      mode: 'interactive',
      location: location,
      period: period,
      userId: userId,
      startTime: new Date().toISOString(),
      items: [],
      status: 'active'
    };
    
    // Stocker la session
    activeSessions.set(sessionId, session);
    
    logger.info(`Session interactive créée: ${sessionId}`);
    
    return {
      success: true,
      sessionId: sessionId,
      location: location,
      period: period,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Erreur lors de la création de la session: ${error.message}`);
    throw new ExternalServiceError('Voice Processing', error.message);
  }
}

/**
 * Traite un segment audio dans une session active
 * @param {Buffer} audioData - Données audio
 * @param {string} sessionId - ID de la session
 * @returns {Promise<Object>} - Résultat du traitement
 */
async function processAudioSegment(audioData, sessionId) {
  try {
    // Vérifier que la session existe
    if (!activeSessions.has(sessionId)) {
      throw new Error(`Session non trouvée: ${sessionId}`);
    }
    
    const session = activeSessions.get(sessionId);
    
    logger.info(`Traitement d'un segment audio pour la session: ${sessionId}`);
    
    // Transcrire le segment audio
    const transcription = await transcribeAudio(audioData);
    
    // Extraire un élément d'inventaire ou détecter une commande
    const command = detectCommand(transcription);
    
    // Si c'est une commande, la retourner
    if (command) {
      logger.info(`Commande détectée: ${command.type}`);
      
      return {
        success: true,
        sessionId: sessionId,
        transcript: transcription,
        command: command,
        timestamp: new Date().toISOString()
      };
    }
    
    // Sinon, essayer d'extraire un élément d'inventaire
    const item = await extractSingleInventoryItem(transcription, session.location);
    
    // Si aucun élément n'a été extrait, retourner simplement la transcription
    if (!item) {
      logger.info(`Aucun élément reconnu dans le segment`);
      
      return {
        success: true,
        sessionId: sessionId,
        transcript: transcription,
        message: 'Aucun élément reconnu',
        confirmationText: 'Je n\'ai pas compris. Pourriez-vous répéter?',
        timestamp: new Date().toISOString()
      };
    }
    
    // Ajouter l'élément à la session
    session.items.push(item);
    
    // Générer un texte de confirmation
    const confirmationText = generateConfirmationText(item);
    
    // Retourner le résultat
    return {
      success: true,
      sessionId: sessionId,
      transcript: transcription,
      item: item,
      needsReview: item.needsReview,
      confidence: item.confidence,
      confirmationText: confirmationText,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Erreur lors du traitement du segment audio: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Termine une session interactive et sauvegarde les résultats
 * @param {string} sessionId - ID de la session
 * @returns {Promise<Object>} - Résultat de la finalisation
 */
async function finishInteractiveSession(sessionId) {
  try {
    // Vérifier que la session existe
    if (!activeSessions.has(sessionId)) {
      throw new Error(`Session non trouvée: ${sessionId}`);
    }
    
    const session = activeSessions.get(sessionId);
    
    logger.info(`Finalisation de la session: ${sessionId}`);
    
    // Marquer la session comme terminée
    session.status = 'completed';
    session.endTime = new Date().toISOString();
    
    // Sauvegarder les éléments dans la base de données
    let saveResult = { success: true, items: 0 };
    
    if (session.items.length > 0) {
      try {
        saveResult = await databaseUtils.saveInventoryItems(
          session.items,
          session.location,
          session.period
        );
        
        logger.info(`${saveResult.saved} éléments sauvegardés pour la session ${sessionId}`);
      } catch (error) {
        logger.error(`Erreur lors de la sauvegarde des éléments de la session: ${error.message}`);
        saveResult = { success: false, error: error.message };
      }
    }
    
    // Préparer le résultat
    const result = {
      success: true,
      sessionId: sessionId,
      itemsCount: session.items.length,
      savedItems: saveResult.success ? saveResult.saved || 0 : 0,
      location: session.location,
      period: session.period,
      duration: calculateSessionDuration(session),
      status: 'completed',
      timestamp: new Date().toISOString()
    };
    
    // Conserver la session pendant un certain temps puis la supprimer
    setTimeout(() => {
      activeSessions.delete(sessionId);
      logger.info(`Session supprimée: ${sessionId}`);
    }, 3600000); // 1 heure
    
    return result;
  } catch (error) {
    logger.error(`Erreur lors de la finalisation de la session: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Calcule la durée d'une session
 * @param {Object} session - Données de session
 * @returns {number} - Durée en secondes
 */
function calculateSessionDuration(session) {
  if (!session.startTime || !session.endTime) {
    return 0;
  }
  
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  
  return Math.floor((end - start) / 1000);
}

/**
 * Transcrit les données audio en texte
 * @param {Buffer} audioData - Données audio sous forme de buffer
 * @returns {Promise<string>} - Texte transcrit
 */
async function transcribeAudio(audioData) {
  try {
    // Détecter le format audio (simplifié pour l'exemple)
    const mimetype = 'audio/webm'; // Dans une implémentation réelle, cela détecterait le format
    
    // Envoyer à Deepgram pour la transcription
    const response = await deepgram.transcription.preRecorded({
      buffer: audioData,
      mimetype
    }, {
      punctuate:true,
      language: 'fr', // Spécifier le français
      model: 'nova-2',
      detect_language: true
    }).transcribe();
    
    // Récupérer la transcription
    if (response?.results?.channels[0]?.alternatives[0]?.transcript) {
      return response.results.channels[0].alternatives[0].transcript;
    }
    
    return '';
  } catch (error) {
    logger.error(`Erreur de transcription: ${error.message}`);
    throw new Error(`La transcription a échoué: ${error.message}`);
  }
}

/**
 * Extrait un seul élément d'inventaire à partir d'un texte
 * @param {string} text - Texte à analyser
 * @param {string} location - Emplacement
 * @returns {Promise<Object|null>} - Élément extrait ou null
 */
async function extractSingleInventoryItem(text, location) {
  try {
    if (!text || text.trim() === '') {
      return null;
    }
    
    // Convertir en minuscules pour une meilleure reconnaissance
    const normalizedText = text.toLowerCase().trim();
    
    // Recherche de motifs comme "X [unités] de [produit]"
    // Exemples: "trois bouteilles de vin", "5 boîtes de chocolat"
    const patterns = [
      // Modèle avec nombre écrit
      /(\w+)\s+(bouteilles?|cannettes?|boîtes?|paquets?|kilos?|grammes?|pièces?|unités?|kg|g|l|ml)\s+(?:de\s+)?([a-zàáâäæçèéêëìíîïòóôöœùúûüÿ\s'-]+)/i,
      
      // Modèle avec chiffre
      /(\d+)\s+(bouteilles?|cannettes?|boîtes?|paquets?|kilos?|grammes?|pièces?|unités?|kg|g|l|ml)\s+(?:de\s+)?([a-zàáâäæçèéêëìíîïòóôöœùúûüÿ\s'-]+)/i
    ];
    
    // Tester chaque modèle
    for (const pattern of patterns) {
      const match = pattern.exec(normalizedText);
      
      if (match) {
        let quantity, unit, productName;
        
        // Extraire la quantité
        if (isNaN(match[1])) {
          // Si c'est un mot, le convertir en nombre
          quantity = motVersNombre[match[1]] || 1;
        } else {
          // Si c'est un chiffre, le convertir en nombre
          quantity = parseInt(match[1], 10);
        }
        
        // Extraire l'unité et standardiser
        unit = match[2].toLowerCase();
        // Standardiser les unités (singulier)
        if (unit.endsWith('s')) {
          unit = unit.slice(0, -1);
        }
        
        // Extraire le nom du produit et le nettoyer
        productName = match[3].trim();
        while (productName.endsWith(',') || productName.endsWith('.') || productName.endsWith(' ')) {
          productName = productName.slice(0, -1).trim();
        }
        
        // Rechercher le produit dans la base de données
        const product = await databaseUtils.findProductByName(productName);
        
        // Préparer l'élément
        const item = {
          productId: product ? product.id : null,
          productName: product ? product.name : productName,
          quantity: quantity,
          unit: unit,
          originalText: match[0],
          location: location,
          timestamp: new Date().toISOString()
        };
        
        // Définir la confiance et si la vérification est nécessaire
        if (product) {
          item.confidence = 0.9; // Haute confiance si le produit est trouvé
          item.needsReview = false;
        } else {
          item.confidence = 0.5; // Faible confiance si le produit n'est pas trouvé
          item.needsReview = true;
        }
        
        return item;
      }
    }
    
    // Aucun élément trouvé
    return null;
  } catch (error) {
    logger.error(`Erreur lors de l'extraction d'un élément d'inventaire: ${error.message}`);
    return null;
  }
}

/**
 * Extrait plusieurs éléments d'inventaire à partir d'un texte
 * @param {string} text - Texte à analyser
 * @param {string} location - Emplacement
 * @returns {Promise<Array>} - Éléments extraits
 */
async function extractInventoryItems(text, location) {
  try {
    logger.info(`Extraction des éléments d'inventaire à partir de: "${text.substring(0, 100)}..."`);
    
    if (!text || text.trim() === '') {
      return [];
    }
    
    // Convertir en minuscules pour une meilleure reconnaissance
    const normalizedText = text.toLowerCase().trim();
    
    // Tableau pour stocker les éléments trouvés
    const items = [];
    
    // Recherche de motifs comme "X [unités] de [produit]"
    // Exemples: "trois bouteilles de vin", "5 boîtes de chocolat"
    const patterns = [
      // Modèle avec nombre écrit
      /(\w+)\s+(bouteilles?|cannettes?|boîtes?|paquets?|kilos?|grammes?|pièces?|unités?|kg|g|l|ml)\s+(?:de\s+)?([a-zàáâäæçèéêëìíîïòóôöœùúûüÿ\s'-]+)/gi,
      
      // Modèle avec chiffre
      /(\d+)\s+(bouteilles?|cannettes?|boîtes?|paquets?|kilos?|grammes?|pièces?|unités?|kg|g|l|ml)\s+(?:de\s+)?([a-zàáâäæçèéêëìíîïòóôöœùúûüÿ\s'-]+)/gi
    ];
    
    // Récupérer la liste des produits pour la recherche
    const products = await databaseUtils.getProducts();
    
    // Tester chaque modèle
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(normalizedText)) !== null) {
        let quantity, unit, productName;
        
        // Extraire la quantité
        if (isNaN(match[1])) {
          // Si c'est un mot, le convertir en nombre
          quantity = motVersNombre[match[1]] || 1;
        } else {
          // Si c'est un chiffre, le convertir en nombre
          quantity = parseInt(match[1], 10);
        }
        
        // Extraire l'unité et standardiser
        unit = match[2].toLowerCase();
        // Standardiser les unités (singulier)
        if (unit.endsWith('s')) {
          unit = unit.slice(0, -1);
        }
        
        // Extraire le nom du produit et le nettoyer
        productName = match[3].trim();
        while (productName.endsWith(',') || productName.endsWith('.') || productName.endsWith(' ')) {
          productName = productName.slice(0, -1).trim();
        }
        
        // Rechercher le produit correspondant le plus proche
        const productMatch = findBestProductMatch(productName, products);
        
        // Préparer l'élément selon le niveau de confiance
        if (productMatch && productMatch.confidence > 0.7) {
          // Produit reconnu avec haute confiance
          items.push({
            productId: productMatch.id,
            productName: productMatch.name,
            quantity: quantity,
            unit: unit,
            originalText: match[0],
            confidence: productMatch.confidence,
            needsReview: false,
            location: location,
            timestamp: new Date().toISOString()
          });
        } else if (productMatch && productMatch.confidence > 0.3) {
          // Produit reconnu avec confiance moyenne
          items.push({
            productId: productMatch.id,
            productName: productMatch.name,
            quantity: quantity,
            unit: unit,
            originalText: match[0],
            confidence: productMatch.confidence,
            needsReview: true,
            possibleMatch: true,
            location: location,
            timestamp: new Date().toISOString()
          });
        } else {
          // Produit non reconnu
          items.push({
            productId: null,
            productName: productName,
            quantity: quantity,
            unit: unit,
            originalText: match[0],
            confidence: 0.2,
            needsReview: true,
            possibleMatch: false,
            location: location,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    logger.info(`${items.length} éléments d'inventaire extraits`);
    return items;
  } catch (error) {
    logger.error(`Erreur lors de l'extraction des éléments d'inventaire: ${error.message}`);
    return [];
  }
}

/**
 * Trouve le meilleur produit correspondant à un nom
 * @param {string} name - Nom du produit à rechercher
 * @param {Array} products - Liste des produits
 * @returns {Object|null} - Meilleure correspondance ou null
 */
function findBestProductMatch(name, products) {
  if (!products || products.length === 0 || !name) {
    return null;
  }
  
  // Nettoyer le nom pour la comparaison
  const searchName = name.toLowerCase().trim();
  
  // Recherche exacte d'abord
  const exactMatch = products.find(p => 
    p.name.toLowerCase() === searchName ||
    p.original_name?.toLowerCase() === searchName
  );
  
  if (exactMatch) {
    return {
      id: exactMatch.id,
      name: exactMatch.name,
      confidence: 1.0
    };
  }
  
  // Calculer les scores de similarité
  const scores = products.map(product => {
    const productNameLower = product.name.toLowerCase();
    const originalNameLower = product.original_name?.toLowerCase() || '';
    
    const nameScore = calculateSimilarity(searchName, productNameLower);
    const originalNameScore = product.original_name 
      ? calculateSimilarity(searchName, originalNameLower) 
      : 0;
    
    const score = Math.max(nameScore, originalNameScore);
    
    return { product, score };
  });
  
  // Trier par score (le plus élevé en premier)
  scores.sort((a, b) => b.score - a.score);
  
  // Retourner le meilleur match s'il existe
  if (scores.length > 0 && scores[0].score > 0.2) {
    return {
      id: scores[0].product.id,
      name: scores[0].product.name,
      confidence: scores[0].score
    };
  }
  
  return null;
}

/**
 * Calcule la similarité entre deux chaînes
 * @param {string} str1 - Première chaîne
 * @param {string} str2 - Deuxième chaîne
 * @returns {number} - Score de similarité (0-1)
 */
function calculateSimilarity(str1, str2) {
  // Si l'une des chaînes est incluse dans l'autre, haute similarité
  if (str1.includes(str2) || str2.includes(str1)) {
    const lengthRatio = Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
    return 0.8 + (0.2 * lengthRatio);
  }
  
  // Diviser en mots et compter les correspondances
  const words1 = str1.split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }
  
  let matches = 0;
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || 
          (word1.length > 3 && word2.includes(word1)) || 
          (word2.length > 3 && word1.includes(word2))) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

/**
 * Détecte une commande vocale dans un texte
 * @param {string} text - Texte à analyser
 * @returns {Object|null} - Commande détectée ou null
 */
function detectCommand(text) {
  if (!text) return null;
  
  const normalizedText = text.toLowerCase();
  
  // Commandes de fin
  if (normalizedText.includes('terminer inventaire') || 
      normalizedText.includes('fin inventaire') || 
      normalizedText.includes('terminer') || 
      normalizedText.includes('finir inventaire')) {
    return { type: 'finish', text: 'Terminer l\'inventaire' };
  }
  
  // Commandes d'annulation
  if (normalizedText.includes('annuler') || 
      normalizedText.includes('annule') || 
      normalizedText.includes('supprimer')) {
    return { type: 'cancel', text: 'Annuler la dernière saisie' };
  }
  
  // Commandes de pause
  if (normalizedText.includes('pause') || 
      normalizedText.includes('suspendre')) {
    return { type: 'pause', text: 'Mettre en pause l\'enregistrement' };
  }
  
  // Commandes de reprise
  if (normalizedText.includes('reprendre') || 
      normalizedText.includes('continuer')) {
    return { type: 'resume', text: 'Reprendre l\'enregistrement' };
  }
  
  // Commandes d'aide
  if (normalizedText.includes('aide') || 
      normalizedText.includes('help') || 
      normalizedText.includes('instructions')) {
    return { type: 'help', text: 'Afficher l\'aide' };
  }
  
  return null;
}

/**
 * Génère un texte de confirmation pour un élément reconnu
 * @param {Object} item - Élément reconnu
 * @returns {string} - Texte de confirmation
 */
function generateConfirmationText(item) {
  if (!item) {
    return "Je n'ai pas compris. Pourriez-vous répéter?";
  }
  
  if (item.needsReview) {
    if (item.possibleMatch) {
      return `J'ai peut-être entendu ${item.quantity} ${item.unit} de ${item.productName}. Est-ce correct?`;
    } else {
      return `Je ne reconnais pas le produit "${item.productName}". Voulez-vous l'ajouter à la base de données?`;
    }
  }
  
  return `Enregistré: ${item.quantity} ${item.unit} de ${item.productName}`;
}

/**
 * Génère les phrases de test pour la calibration vocale
 * @returns {Object} - Phrases de test
 */
function generateCalibrationTestPhrases() {
  return {
    productSimple: "trois bouteilles de vin rouge et deux cannettes de bière",
    productComplex: "cinq bouteilles de gin tonic premium et une bouteille de whisky single malt",
    numbers: "dix-sept bouteilles, vingt-trois cannettes, quarante-cinq boîtes",
    units: "bouteilles de vin, cannettes de soda, grammes de sucre, kilogrammes de farine",
    commands: "terminer inventaire, annuler la dernière saisie, pause, reprendre l'enregistrement",
    complex: "j'ai compté huit bouteilles de vin blanc, douze bouteilles de vin rouge, et vingt-quatre cannettes de bière pour l'inventaire de la cuisine"
  };
}

/**
 * Effectue une calibration vocale pour un utilisateur
 * @param {Buffer} audioData - Données audio
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Résultats de la calibration
 */
async function performVoiceCalibration(audioData, userId) {
  try {
    logger.info(`Réalisation de la calibration vocale pour l'utilisateur: ${userId}`);
    
    // Transcrire l'audio
    const transcript = await transcribeAudio(audioData);
    
    // Générer des phrases de test pour comparer
    const testPhrases = generateCalibrationTestPhrases();
    
    // Analyser les résultats
    const results = {
      originalTranscript: transcript,
      recognizedPhrases: {},
      overallScore: 0,
      recommendations: []
    };
    
    // Évaluer les résultats
    let totalScore = 0;
    let phrasesEvaluated = 0;
    
    // Analyser chaque phrase de test
    for (const [key, expectedPhrase] of Object.entries(testPhrases)) {
      const score = calculateSimilarity(transcript.toLowerCase(), expectedPhrase.toLowerCase());
      results.recognizedPhrases[key] = {
        expected: expectedPhrase,
        score: score
      };
      
      totalScore += score;
      phrasesEvaluated++;
    }
    
    // Calculer le score global
    results.overallScore = phrasesEvaluated > 0 ? totalScore / phrasesEvaluated : 0;
    
    // Générer des recommandations
    if (results.overallScore < 0.4) {
      results.recommendations.push("Essayez de parler plus clairement et plus lentement");
      results.recommendations.push("Réduisez les bruits de fond pendant l'enregistrement");
      results.recommendations.push("Tenez le microphone plus près de votre bouche");
    } else if (results.overallScore < 0.7) {
      results.recommendations.push("Articulez davantage les noms de produits");
      results.recommendations.push("Faites une pause entre chaque produit");
    } else {
      results.recommendations.push("Votre voix est bien reconnue ! Continuez ainsi.");
    }
    
    // Ajouter des détails de compatibilité
    results.compatibility = {
      numberRecognition: results.recognizedPhrases.numbers.score > 0.6,
      productNameRecognition: results.recognizedPhrases.productSimple.score > 0.6,
      commandRecognition: results.recognizedPhrases.commands.score > 0.6
    };
    
    logger.info(`Calibration vocale terminée pour l'utilisateur ${userId} avec un score de ${results.overallScore.toFixed(2)}`);
    
    return {
      success: true,
      userId: userId,
      calibrationResults: results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Erreur lors de la calibration vocale: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  processVoiceFile,
  startInteractiveSession,
  processAudioSegment,
  finishInteractiveSession,
  transcribeAudio,
  extractInventoryItems,
  extractSingleInventoryItem,
  detectCommand,
  generateCalibrationTestPhrases,
  performVoiceCalibration,
  generateConfirmationText
};