/**
 * Planificateur de traitement des factures
 * Exécute automatiquement le traitement des factures selon une crontab
 */
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const invoiceProcessor = require('./invoice-processor');
const notificationService = require('../utils/notification-service');
const logger = require('../utils/logger');
const config = require('../config');

// Instance du planificateur
let scheduler = null;

/**
 * Démarrer le planificateur de traitement des factures
 */
function startScheduler() {
  // Vérifier si le planificateur est déjà en cours d'exécution
  if (scheduler) {
    logger.warn('Planificateur de traitement des factures déjà démarré');
    return false;
  }
  
  // Vérifier que la crontab est valide
  if (!cron.validate(config.invoiceScheduler.schedule)) {
    logger.error(`Expression cron invalide: ${config.invoiceScheduler.schedule}`);
    return false;
  }
  
  // Créer le planificateur
  scheduler = cron.schedule(config.invoiceScheduler.schedule, async () => {
    logger.info('Exécution du traitement automatique des factures');
    
    try {
      const result = await processPendingInvoices();
      
      // Envoyer une notification avec les résultats
      if (result.processed > 0 || result.failed > 0) {
        await notificationService.sendInvoiceProcessingReport(result);
      }
    } catch (error) {
      logger.error(`Erreur lors du traitement automatique des factures: ${error.message}`);
      
      // Notifier les administrateurs en cas d'erreur
      await notificationService.notifyAdmins(
        'Erreur du planificateur de factures',
        `Le traitement automatique des factures a échoué: ${error.message}`
      );
    }
  });
  
  logger.info(`Planificateur de traitement des factures démarré avec la crontab: ${config.invoiceScheduler.schedule}`);
  return true;
}

/**
 * Arrêter le planificateur de traitement des factures
 */
function stopScheduler() {
  if (scheduler) {
    scheduler.stop();
    scheduler = null;
    logger.info('Planificateur de traitement des factures arrêté');
    return true;
  }
  
  logger.warn('Planificateur de traitement des factures non démarré');
  return false;
}

/**
 * Traiter toutes les factures en attente
 * @returns {Promise<Object>} Résultats du traitement
 */
async function processPendingInvoices() {
  const sourceDir = config.invoiceScheduler.directories.source;
  const processedDir = config.invoiceScheduler.directories.processed;
  const failedDir = config.invoiceScheduler.directories.failed;
  
  logger.info(`Traitement des factures depuis le répertoire: ${sourceDir}`);
  
  // Créer les répertoires s'ils n'existent pas
  await createDirectoryIfNotExists(sourceDir);
  await createDirectoryIfNotExists(processedDir);
  await createDirectoryIfNotExists(failedDir);
  
  // Récupérer la liste des fichiers de facture
  let files;
  try {
    files = await fs.readdir(sourceDir);
    files = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext);
    });
  } catch (error) {
    logger.error(`Erreur lors de la lecture du répertoire: ${error.message}`);
    throw error;
  }
  
  if (files.length === 0) {
    logger.info('Aucune facture à traiter');
    return { processed: 0, failed: 0, message: 'Aucune facture à traiter' };
  }
  
  logger.info(`${files.length} factures trouvées pour traitement`);
  
  // Résultats du traitement
  const results = {
    processed: 0,
    failed: 0,
    successItems: [],
    failedItems: []
  };
  
  // Traiter chaque fichier
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
      logger.info(`Traitement de la facture: ${file}`);
      
      // Traiter la facture
      const result = await invoiceProcessor.processInvoice(filePath);
      
      // Déplacer le fichier vers le répertoire des fichiers traités
      const targetPath = path.join(processedDir, `${timestamp}_${file}`);
      await fs.rename(filePath, targetPath);
      
      results.processed++;
      results.successItems.push({
        file,
        invoiceId: result.invoiceId,
        date: result.date,
        supplier: result.supplier,
        itemCount: result.items.length
      });
      
      logger.info(`Facture traitée avec succès: ${file}`);
    } catch (error) {
      logger.error(`Échec du traitement de la facture ${file}: ${error.message}`);
      
      try {
        // Déplacer le fichier vers le répertoire des fichiers en échec
        const targetPath = path.join(failedDir, `${timestamp}_${file}`);
        await fs.rename(filePath, targetPath);
      } catch (moveError) {
        logger.error(`Erreur lors du déplacement du fichier en échec: ${moveError.message}`);
      }
      
      results.failed++;
      results.failedItems.push({
        file,
        error: error.message
      });
    }
  }
  
  logger.info(`Traitement des factures terminé. Traitées: ${results.processed}, Échecs: ${results.failed}`);
  return results;
}

/**
 * Créer un répertoire s'il n'existe pas
 * @param {string} directory - Chemin du répertoire
 */
async function createDirectoryIfNotExists(directory) {
  try {
    await fs.access(directory);
  } catch (error) {
    await fs.mkdir(directory, { recursive: true });
    logger.info(`Répertoire créé: ${directory}`);
  }
}

/**
 * Exécuter un traitement manuel des factures
 * @returns {Promise<Object>} Résultats du traitement
 */
async function runManualProcessing() {
  logger.info('Exécution manuelle du traitement des factures');
  
  try {
    return await processPendingInvoices();
  } catch (error) {
    logger.error(`Erreur lors du traitement manuel: ${error.message}`);
    throw error;
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  processPendingInvoices,
  runManualProcessing
};
