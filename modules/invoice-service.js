/**
 * Service de traitement des factures
 * Gère le processus de traitement des factures pour le système d'inventaire
 */
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const invoiceProcessor = require('./invoice-processor');
const databaseUtils = require('../utils/database-utils');
const logger = require('../utils/logger');
const config = require('../config');

// Variable pour stocker la tâche planifiée
let scheduledTask = null;

/**
 * Traite toutes les factures dans un répertoire
 * @param {string} sourceDir - Répertoire contenant les factures à traiter
 * @param {string} processedDir - Répertoire pour déplacer les factures traitées
 * @returns {Promise<Object>} - Résultats du traitement
 */
async function processInvoices(sourceDir, processedDir) {
  logger.info(`Traitement des factures depuis ${sourceDir}`);
  
  try {
    // Assurer que le répertoire de destination existe
    await fs.mkdir(processedDir, { recursive: true });
    
    // Lister tous les fichiers du répertoire source
    const files = await fs.readdir(sourceDir);
    
    // Filtrer pour ne garder que les factures (PDF, JPG, PNG)
    const invoiceFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext);
    });
    
    if (invoiceFiles.length === 0) {
      logger.info('Aucune facture trouvée à traiter');
      return {
        success: true,
        processed: 0,
        errors: 0
      };
    }
    
    // Traiter chaque facture
    let processed = 0;
    let errors = 0;
    const results = [];
    
    for (const file of invoiceFiles) {
      const filePath = path.join(sourceDir, file);
      const processedPath = path.join(processedDir, file);
      
      try {
        logger.info(`Traitement de la facture: ${file}`);
        
        // Déterminer l'emplacement en fonction du nom du fichier (simplifié)
        const location = file.toLowerCase().includes('kitchen') ? 'Cuisine' : 'Bar';
        
        // Traiter la facture
        const invoiceData = await invoiceProcessor.processInvoice(filePath, location);
        
        // Sauvegarder les données dans la base de données
        await databaseUtils.saveInvoice(invoiceData);
        
        // Mettre à jour l'inventaire avec les articles de la facture
        if (invoiceData.items && invoiceData.items.length > 0) {
          await databaseUtils.saveInventoryItems({
            date: invoiceData.date,
            location: invoiceData.location,
            items: invoiceData.items
          });
        }
        
        // Déplacer le fichier vers le répertoire des factures traitées
        await fs.rename(filePath, processedPath);
        
        processed++;
        results.push({
          file,
          success: true,
          invoiceId: invoiceData.invoiceId,
          itemCount: invoiceData.items.length
        });
      } catch (error) {
        logger.error(`Erreur lors du traitement de la facture ${file}: ${error.message}`);
        errors++;
        results.push({
          file,
          success: false,
          error: error.message
        });
      }
    }
    
    logger.info(`Traitement terminé. Traitées: ${processed}, Erreurs: ${errors}`);
    
    return {
      success: true,
      processed,
      errors,
      results
    };
  } catch (error) {
    logger.error(`Erreur lors du traitement des factures: ${error.message}`);
    return {
      success: false,
      processed: 0,
      errors: 1,
      error: error.message
    };
  }
}

/**
 * Traite une seule facture
 * @param {string} filePath - Chemin vers le fichier de facture
 * @param {string} location - Emplacement (Bar, Cuisine, etc.)
 * @returns {Promise<Object>} - Données de la facture traitée
 */
async function processSingleInvoice(filePath, location) {
  try {
    logger.info(`Traitement d'une facture individuelle: ${filePath}`);
    
    // Traiter la facture
    const invoiceData = await invoiceProcessor.processInvoice(filePath, location);
    
    // Mettre à jour la base de données des produits si nécessaire
    for (const item of invoiceData.items) {
      // Vérifier si le produit existe déjà
      const existingProduct = await databaseUtils.findProductByName(item.product);
      
      if (!existingProduct) {
        logger.info(`Ajout d'un nouveau produit à la base de données: ${item.product}`);
        
        // Ajouter le produit à la base de données
        await databaseUtils.addProduct({
          name: item.product,
          unit: determineUnit(item.product),
          price: extractPrice(item.price)
        });
      }
    }
    
    // Sauvegarder les données de la facture
    const savedInvoice = await databaseUtils.saveInvoice(invoiceData);
    
    return {
      ...invoiceData,
      id: savedInvoice.id
    };
  } catch (error) {
    logger.error(`Erreur lors du traitement de la facture: ${error.message}`);
    throw error;
  }
}

/**
 * Démarre le planificateur de traitement des factures
 * @returns {boolean} - Indique si le planificateur a été démarré
 */
function startScheduler() {
  if (scheduledTask) {
    logger.warn('Le planificateur est déjà en cours d\'exécution');
    return false;
  }
  
  const schedule = config.invoiceSchedule || '0 0 * * *'; // Par défaut: minuit tous les jours
  
  logger.info(`Démarrage du planificateur avec la programmation: ${schedule}`);
  
  scheduledTask = cron.schedule(schedule, async () => {
    logger.info('Exécution du traitement planifié des factures');
    
    const sourceDir = config.invoiceSourceDir || './uploads/invoices';
    const processedDir = config.invoiceProcessedDir || './uploads/invoices/processed';
    
    try {
      await processInvoices(sourceDir, processedDir);
    } catch (error) {
      logger.error(`Erreur lors du traitement planifié des factures: ${error.message}`);
    }
  });
  
  return true;
}

/**
 * Arrête le planificateur de traitement des factures
 * @returns {boolean} - Indique si le planificateur a été arrêté
 */
function stopScheduler() {
  if (!scheduledTask) {
    logger.warn('Aucun planificateur en cours d\'exécution');
    return false;
  }
  
  logger.info('Arrêt du planificateur de traitement des factures');
  scheduledTask.stop();
  scheduledTask = null;
  
  return true;
}

/**
 * Détermine l'unité d'un produit en fonction de son nom
 * @param {string} productName - Nom du produit
 * @returns {string} - Unité déterminée
 */
function determineUnit(productName) {
  const name = productName.toLowerCase();
  
  if (name.includes('vin') || name.includes('vodka') || name.includes('whisky') || 
      name.includes('gin') || name.includes('rhum') || name.includes('sake') ||
      name.includes('ワイン') || name.includes('ウォッカ')) {
    return 'bouteille';
  }
  
  if (name.includes('b
}

/**
 * Détermine l'unité d'un produit en fonction de son nom
 * @param {string} productName - Nom du produit
 * @returns {string} - Unité déterminée
 */
function determineUnit(productName) {
  const name = productName.toLowerCase();
  
  if (name.includes('vin') || name.includes('vodka') || name.includes('whisky') || 
      name.includes('gin') || name.includes('rhum') || name.includes('sake') ||
      name.includes('ワイン') || name.includes('ウォッカ')) {
    return 'bouteille';
  }
  
  if (name.includes('bRéessayerClaude a atteint la longueur maximale pour un message et a mis sa réponse en pause. Vous pouvez écrire Continuer pour poursuivre la conversation.OVdo not continue by re-writing modules/invoice-service.js. just write the end of the file, starting at: function determineUnit(productName) {   const name = productName.toLowerCase();      if (name.includes('vin') || name.includes('vodka') || name.includes('whisky') ||        name.includes('gin') || name.includes('rhum') || name.includes('sake') ||       name.includes('ワイン') || name.includes('ウォッカ')) {     return 'bouteille';   }      if (name.includes('b
Réessayer
Claude a atteint la longueur maximale pour un message et a mis sa réponse en pause. Vous pouvez écrire Continuer pour poursuivre la conversation.ModifierVoici la fin de la fonction determineUnit et le reste du module invoice-service.js :
javascriptCopier  if (name.includes('bière') || name.includes('soda') || name.includes('jus') || 
      name.includes('ビール')) {
    return 'cannette';
  }
  
  if (name.includes('farine') || name.includes('sucre') || name.includes('sel') ||
      name.includes('riz') || name.includes('米')) {
    return 'kg';
  }
  
  return 'unité'; // Unité par défaut
}

/**
 * Extrait le prix à partir d'une chaîne de caractères
 * @param {string} priceString - Chaîne contenant le prix
 * @returns {number} - Prix extrait
 */
function extractPrice(priceString) {
  // Supprimer les symboles de devise et les espaces
  const cleanString = priceString.replace(/[€¥$\s]/g, '');
  
  // Remplacer les virgules par des points pour les nombres décimaux
  const numberString = cleanString.replace(',', '.');
  
  // Convertir en nombre
  return parseFloat(numberString) || 0;
}

module.exports = {
  processInvoices,
  processSingleInvoice,
  startScheduler,
  stopScheduler
};
