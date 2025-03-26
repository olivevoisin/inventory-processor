/**
 * Module de traitement vocal en français
 * Gère le traitement des enregistrements vocaux pour l'inventaire
 */
const fs = require('fs').promises;
const path = require('path');
const { Deepgram } = require('@deepgram/sdk');
const logger = require('../utils/logger');
const databaseUtils = require('../utils/database-utils');
const { ExternalServiceError } = require('../utils/error-handler');
const config = require('../config');

// Créer le client Deepgram
const deepgramApiKey = config.voiceProcessing?.deepgramApiKey || process.env.DEEPGRAM_API_KEY;
const deepgram = new Deepgram(deepgramApiKey);

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
 * @param {string} location - Emplacement de l'inventaire (cuisine maison, boisson bicoque, etc.)
 * @param {string} period - Période d'inventaire (mois-année)
 * @returns {Promise<Object>} - Résultats du traitement
 */
async function processVoiceFile(filePath, location, period) {
  try {
    logger.info(`Traitement du fichier audio: ${filePath} pour l'emplacement: ${location}, période: ${period}`);
    
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
      items: items,
      recognizedItemsCount: items.filter(item => !item.needsReview).length,
      unrecognizedItemsCount: items.filter(item => item.needsReview).length,
      timestamp: new Date().toISOString()
    };
    
    // Sauvegarder les résultats dans Google Sheets
    if (items.length > 0) {
      try {
        const sheetName = `inventory_${location.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}`;
        await databaseUtils.saveInventoryItems(items, sheetName);
        results.savedToSheet = sheetName;
      } catch (saveError) {
        logger.error(`Erreur lors de la sauvegarde de l'inventaire: ${saveError.message}`);
        results.saveError = saveError.message;
      }
    }
    
    return results;
  } catch (error) {
    logger.error(`Erreur lors du traitement du fichier audio: ${error.message}`);
    throw new ExternalServiceError('Voice Processing', error.message);
  }
}

/**
 * Transcrit les données audio en texte
 * @param {Buffer} audioData - Données audio sous forme de buffer
 * @returns {Promise<string>} - Texte transcrit
 */
async function transcribeAudio(audioData) {
  try {
    // Détecter le format audio (simplifié pour l'exemple)
    const mimetype = 'audio/wav'; // Dans une implémentation réelle, cela détecterait le format
    
    // Envoyer à Deepgram pour la transcription
    const response = await deepgram.transcription.preRecorded({
      buffer: audioData,
      mimetype
    }, {
      punctuate: true,
      language: 'fr', // Spécifier le français
      model: 'nova-2'
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
 * Extrait les éléments d'inventaire à partir du texte transcrit
 * @param {string} transcript - Texte transcrit
 * @param {string} location - Emplacement de l'inventaire
 * @returns {Promise<Array<Object>>} - Éléments d'inventaire extraits
 */
async function extractInventoryItems(transcript, location) {
  try {
    logger.info(`Extraction des éléments d'inventaire à partir de la transcription`);
    
    if (!transcript || transcript.trim() === '') {
      return [];
    }
    
    // Convertir en minuscules pour une meilleure reconnaissance
    const text = transcript.toLowerCase();
    
    // Tableau pour stocker les éléments d'inventaire extraits
    const items = [];
    
    // Récupérer la base de données des produits
    const products = await databaseUtils.getProducts();
    
    // Recherche de motifs comme "X [unités] de [produit]"
    // Exemples: "trois bouteilles de vin", "5 boîtes de chocolat"
    const patterns = [
      // Modèle avec nombre écrit
      /(\w+)\s+(bouteilles?|cannettes?|boîtes?|paquets?|kilos?|grammes?|pièces?|unités?|kg|g|l|ml)\s+(?:de\s+)?(\w[\w\s'-]*)/gi,
      
      // Modèle avec chiffre
      /(\d+)\s+(bouteilles?|cannettes?|boîtes?|paquets?|kilos?|grammes?|pièces?|unités?|kg|g|l|ml)\s+(?:de\s+)?(\w[\w\s'-]*)/gi
    ];
    
    // Analyser le texte pour chaque modèle
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
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
        
        // Extraire le nom du produit
        productName = match[3].trim();
        
        // Rechercher le produit dans la base de données
        const productMatch = findBestProductMatch(productName, products);
        
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
            timestamp: new Date().toISOString(),
            location: location
          });
        } else if (productMatch && productMatch.confidence > 0.5) {
          // Produit reconnu avec confiance moyenne - marquer pour révision
          items.push({
            productId: productMatch.id,
            productName: productMatch.name,
            quantity: quantity,
            unit: unit,
            originalText: match[0],
            confidence: productMatch.confidence,
            needsReview: true,
            possibleMatch: true,
            timestamp: new Date().toISOString(),
            location: location
          });
        } else {
          // Produit non reconnu - marquer pour révision
          items.push({
            productId: null,
            productName: productName,
            quantity: quantity,
            unit: unit,
            originalText: match[0],
            confidence: productMatch ? productMatch.confidence : 0,
            needsReview: true,
            possibleMatch: false,
            timestamp: new Date().toISOString(),
            location: location
          });
        }
      }
    }
    
    logger.info(`${items.length} éléments d'inventaire extraits, dont ${items.filter(item => !item.needsReview).length} reconnus avec une haute confiance`);
    
    return items;
  } catch (error) {
    logger.error(`Erreur lors de l'extraction des éléments d'inventaire: ${error.message}`);
    return [];
  }
}

/**
 * Trouve le meilleur produit correspondant dans la base de données
 * @param {string} productName - Nom du produit à rechercher
 * @param {Array<Object>} products - Liste des produits dans la base de données
 * @returns {Object|null} - Meilleur produit correspondant ou null
 */
function findBestProductMatch(productName, products) {
  if (!products || products.length === 0 || !productName) {
    return null;
  }
  
  // Nettoyer le nom du produit pour la comparaison
  const searchName = productName.toLowerCase().trim();
  
  // Calculer les scores de similarité
  const scores = products.map(product => {
    const productNameLower = product.name.toLowerCase();
    const score = calculateSimilarity(searchName, productNameLower);
    return { product, score };
  });
  
  // Trier par score (le plus élevé en premier)
  scores.sort((a, b) => b.score - a.score);
  
  // Retourner le meilleur match s'il existe
  if (scores.length > 0 && scores[0].score > 0.3) {
    return {
      id: scores[0].product.id,
      name: scores[0].product.name,
      confidence: scores[0].score
    };
  }
  
  return null;
}

/**
 * Calcule la similarité entre deux chaînes de caractères
 * @param {string} str1 - Première chaîne
 * @param {string} str2 - Deuxième chaîne
 * @returns {number} - Score de similarité (0-1)
 */
function calculateSimilarity(str1, str2) {
  // Méthode simplifiée - dans un cas réel, nous utiliserions une approche plus sophistiquée
  
  // Si l'une des chaînes est incluse dans l'autre, haute similarité
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.9;
  }
  
  // Diviser en mots et compter les correspondances
  const words1 = str1.split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.split(/\s+/).filter(w => w.length > 2);
  
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || (word1.length > 3 && word2.includes(word1)) || (word2.length > 3 && word1.includes(word2))) {
        matches++;
        break;
      }
    }
  }
  
  const matchScore = words1.length > 0 ? matches / words1.length : 0;
  
  return matchScore;
}

/**
 * Propose des actions pour les éléments non reconnus
 * @param {Array<Object>} unrecognizedItems - Éléments non reconnus
 * @returns {Array<Object>} - Actions suggérées pour chaque élément
 */
function suggestActionsForUnrecognizedItems(unrecognizedItems) {
  return unrecognizedItems.map(item => {
    return {
      originalItem: item,
      actions: [
        {
          type: 'repeat',
          description: 'Répéter la dictée pour ce produit'
        },
        {
          type: 'take_photo',
          description: 'Prendre une photo du produit'
        },
        {
          type: 'add_new',
          description: 'Ajouter comme nouveau produit à la base de données'
        },
        {
          type: 'skip',
          description: 'Ignorer ce produit'
        }
      ]
    };
  });
}

module.exports = {
  processVoiceFile,
  transcribeAudio,
  extractInventoryItems,
  suggestActionsForUnrecognizedItems
};
