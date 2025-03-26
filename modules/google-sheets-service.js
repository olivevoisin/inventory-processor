/**
 * Service Google Sheets
 * Gère l'intégration avec Google Sheets pour la gestion des données d'inventaire
 */
const { GoogleSpreadsheet } = require('google-spreadsheet');
const logger = require('../utils/logger');
const config = require('../config');
const { ExternalServiceError } = require('../utils/error-handler');

// Instance du document Google Sheets
let doc = null;

/**
 * Initialise la connexion à Google Sheets
 * @returns {Promise<boolean>} - Statut de la connexion
 */
async function initialize() {
  try {
    if (!config.googleSheets.enabled) {
      logger.info('Intégration Google Sheets désactivée');
      return false;
    }
    
    if (!config.googleSheets.docId || !config.googleSheets.clientEmail || !config.googleSheets.privateKey) {
      logger.error('Configuration Google Sheets incomplète. Vérifiez les variables d\'environnement.');
      return false;
    }
    
    // Créer une instance du document
    doc = new GoogleSpreadsheet(config.googleSheets.docId);
    
    // Authentification
    await doc.useServiceAccountAuth({
      client_email: config.googleSheets.clientEmail,
      private_key: config.googleSheets.privateKey.replace(/\\n/g, '\n')
    });
    
    // Charger les informations du document
    await doc.loadInfo();
    
    logger.info(`Connecté au document Google Sheets: ${doc.title}`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation de Google Sheets: ${error.message}`);
    doc = null;
    return false;
  }
}

/**
 * Vérifie si la connexion est établie
 * @returns {boolean} - Statut de la connexion
 */
function isConnected() {
  return doc !== null;
}

/**
 * Obtient ou crée une feuille de calcul
 * @param {string} sheetTitle - Titre de la feuille
 * @returns {Promise<Object>} - Feuille de calcul
 */
async function getOrCreateSheet(sheetTitle) {
  try {
    if (!isConnected()) {
      await initialize();
    }
    
    if (!doc) {
      throw new Error('Impossible de se connecter à Google Sheets');
    }
    
    // Rechercher la feuille existante
    let sheet = doc.sheetsByTitle[sheetTitle];
    
    // Créer la feuille si elle n'existe pas
    if (!sheet) {
      logger.info(`Création d'une nouvelle feuille: ${sheetTitle}`);
      sheet = await doc.addSheet({ title: sheetTitle });
    }
    
    return sheet;
  } catch (error) {
    logger.error(`Erreur lors de l'accès à la feuille ${sheetTitle}: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Récupère les produits depuis Google Sheets
 * @returns {Promise<Array>} - Liste des produits
 */
async function getProducts() {
  try {
    const sheetTitle = config.googleSheets.sheetTitles.products || 'Products';
    const sheet = await getOrCreateSheet(sheetTitle);
    
    // Charger les lignes
    const rows = await sheet.getRows();
    
    // Convertir en objets produits
    const products = rows.map(row => {
      return {
        id: row.id || row.ID || row._id || row._rowNumber.toString(),
        name: row.name || row.Name || row.nom || row.Nom || '',
        original_name: row.original_name || row.originalName || row.nom_original || '',
        unit: row.unit || row.Unit || row.unité || row.Unité || 'pièce',
        price: parseFloat(row.price || row.Price || row.prix || row.Prix || '0'),
        supplier: row.supplier || row.Supplier || row.fournisseur || row.Fournisseur || '',
        location: row.location || row.Location || row.emplacement || row.Emplacement || '',
        last_updated: row.last_updated || row.lastUpdated || row.dernière_maj || row.Date || new Date().toISOString()
      };
    });
    
    logger.info(`${products.length} produits récupérés depuis Google Sheets`);
    return products;
  } catch (error) {
    logger.error(`Erreur lors de la récupération des produits: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Récupère l'inventaire depuis Google Sheets pour une location et une période spécifiques
 * @param {string} location - Emplacement de l'inventaire
 * @param {string} period - Période de l'inventaire (YYYY-MM)
 * @returns {Promise<Array>} - Données d'inventaire
 */
async function getInventory(location, period) {
  try {
    const sheetTitle = `inventory_${location}_${period}`;
    
    try {
      const sheet = await getOrCreateSheet(sheetTitle);
      
      // Charger les lignes
      const rows = await sheet.getRows();
      
      // Convertir en objets d'inventaire
      const inventory = rows.map(row => {
        return {
          id: row.id || row.ID || row._rowNumber.toString(),
          product_id: row.product_id || row.productId || row.id_produit || '',
          product_name: row.product_name || row.productName || row.nom_produit || '',
          quantity: parseFloat(row.quantity || row.Quantity || row.quantité || '0'),
          unit: row.unit || row.Unit || row.unité || 'pièce',
          date: row.date || row.Date || new Date().toISOString().split('T')[0],
          user: row.user || row.User || row.utilisateur || '',
          notes: row.notes || row.Notes || row.remarques || ''
        };
      });
      
      logger.info(`${inventory.length} éléments d'inventaire récupérés pour ${location} (${period})`);
      return inventory;
    } catch (error) {
      if (error.message.includes('not found')) {
        logger.info(`Aucune donnée d'inventaire trouvée pour ${location} (${period})`);
        return [];
      }
      throw error;
    }
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'inventaire: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Enregistre des éléments d'inventaire dans Google Sheets
 * @param {Array} items - Éléments d'inventaire à enregistrer
 * @param {string} location - Emplacement
 * @param {string} period - Période (YYYY-MM)
 * @returns {Promise<Object>} - Résultat de l'enregistrement
 */
async function saveInventoryItems(items, location, period) {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: true, saved: 0, message: 'Aucun élément à enregistrer' };
    }
    
    const sheetTitle = `inventory_${location}_${period}`;
    const sheet = await getOrCreateSheet(sheetTitle);
    
    // Vérifier si des en-têtes sont déjà définis, sinon les ajouter
    const headerValues = sheet.headerValues || [];
    if (headerValues.length === 0) {
      // Définir les en-têtes de colonne
      await sheet.setHeaderRow([
        'id', 'product_id', 'product_name', 'quantity', 'unit',
        'date', 'user', 'original_text', 'confidence', 'notes'
      ]);
    }
    
    // Ajouter chaque élément comme une nouvelle ligne
    let saved = 0;
    let errors = 0;
    
    for (const item of items) {
      try {
        await sheet.addRow({
          id: item.id || `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          product_id: item.productId || item.product_id || '',
          product_name: item.productName || item.product_name || item.name || '',
          quantity: item.quantity.toString(),
          unit: item.unit || 'pièce',
          date: item.date || item.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
          user: item.user || item.userId || '',
          original_text: item.originalText || item.original_text || '',
          confidence: item.confidence?.toString() || '1',
          notes: item.notes || ''
        });
        
        saved++;
      } catch (error) {
        logger.error(`Erreur lors de l'ajout d'un élément d'inventaire: ${error.message}`);
        errors++;
      }
    }
    
    logger.info(`${saved} éléments d'inventaire enregistrés dans ${sheetTitle}, ${errors} erreurs`);
    
    return {
      success: true,
      saved,
      errors,
      sheet: sheetTitle
    };
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement des éléments d'inventaire: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

/**
 * Ajoute ou met à jour un produit dans la base de données
 * @param {Object} productData - Données du produit
 * @returns {Promise<Object>} - Produit ajouté ou mis à jour
 */
async function saveProduct(productData) {
  try {
    const sheetTitle = config.googleSheets.sheetTitles.products || 'Products';
    const sheet = await getOrCreateSheet(sheetTitle);
    
    // Vérifier si des en-têtes sont déjà définis, sinon les ajouter
    const headerValues = sheet.headerValues || [];
    if (headerValues.length === 0) {
      // Définir les en-têtes de colonne
      await sheet.setHeaderRow([
        'id', 'name', 'original_name', 'unit', 'price',
        'supplier', 'location', 'last_updated'
      ]);
    }
    
    // Charger toutes les lignes pour rechercher le produit existant
    const rows = await sheet.getRows();
    let existingRow = null;
    
    // Chercher un produit existant par ID ou par nom
    if (productData.id) {
      existingRow = rows.find(row => row.id === productData.id);
    }
    
    if (!existingRow && productData.name) {
      existingRow = rows.find(row => 
        row.name?.toLowerCase() === productData.name.toLowerCase() ||
        row.original_name?.toLowerCase() === productData.name.toLowerCase()
      );
    }
    
    if (existingRow) {
      // Mettre à jour le produit existant
      existingRow.name = productData.name || existingRow.name;
      existingRow.original_name = productData.original_name || existingRow.original_name;
      existingRow.unit = productData.unit || existingRow.unit;
      existingRow.price = productData.price?.toString() || existingRow.price;
      existingRow.supplier = productData.supplier || existingRow.supplier;
      existingRow.location = productData.location || existingRow.location;
      existingRow.last_updated = new Date().toISOString();
      
      await existingRow.save();
      
      logger.info(`Produit mis à jour: ${productData.name}`);
      return {
        id: existingRow.id,
        ...productData,
        updated: true
      };
    } else {
      // Ajouter un nouveau produit
      const newProduct = {
        id: productData.id || `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: productData.name || '',
        original_name: productData.original_name || '',
        unit: productData.unit || 'pièce',
        price: productData.price?.toString() || '0',
        supplier: productData.supplier || '',
        location: productData.location || '',
        last_updated: new Date().toISOString()
      };
      
      await sheet.addRow(newProduct);
      
      logger.info(`Nouveau produit ajouté: ${productData.name}`);
      return {
        ...newProduct,
        created: true
      };
    }
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement du produit: ${error.message}`);
    throw new ExternalServiceError('Google Sheets', error.message);
  }
}

// Initialiser au démarrage du module
initialize().catch(err => {
  logger.error(`Erreur lors de l'initialisation de Google Sheets: ${err.message}`);
});

module.exports = {
  initialize,
  isConnected,
  getProducts,
  getInventory,
  saveInventoryItems,
  saveProduct
};
