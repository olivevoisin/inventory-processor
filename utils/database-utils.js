/**
 * Utilitaires de base de données étendus
 * Fournit des fonctionnalités avancées pour gérer les données d'inventaire
 */
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const googleSheetsService = require('../modules/google-sheets-service');

/**
 * Récupérer tous les produits
 * @param {string} location - Emplacement optionnel pour filtrer
 * @returns {Promise<Array>} - Liste des produits
 */
async function getProducts(location) {
  try {
    logger.info(`Récupération des produits${location ? ` pour l'emplacement ${location}` : ''}`);
    
    // Récupérer les produits depuis Google Sheets
    const products = await googleSheetsService.getProducts();
    
    // Filtrer par emplacement si spécifié
    if (location) {
      return products.filter(product => 
        !product.location || product.location === location
      );
    }
    
    return products;
  } catch (error) {
    logger.error(`Erreur lors de la récupération des produits: ${error.message}`);
    
    // Fallback à une liste vide en cas d'erreur
    return [];
  }
}

/**
 * Rechercher un produit par nom avec correspondance approximative
 * @param {string} name - Nom du produit à rechercher
 * @returns {Promise<Object|null>} - Produit trouvé ou null
 */
async function findProductByName(name) {
  if (!name) return null;
  
  try {
    logger.info(`Recherche du produit: ${name}`);
    
    // Normaliser le nom pour la recherche
    const searchName = name.toLowerCase().trim();
    
    // Récupérer tous les produits
    const products = await getProducts();
    
    // Rechercher une correspondance exacte d'abord
    let product = products.find(p => 
      p.name.toLowerCase() === searchName ||
      p.original_name.toLowerCase() === searchName
    );
    
    if (product) {
      logger.info(`Produit trouvé avec correspondance exacte: ${product.name}`);
      return product;
    }
    
    // Rechercher une correspondance partielle
    const matchingProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchName) ||
      searchName.includes(p.name.toLowerCase()) ||
      (p.original_name && (
        p.original_name.toLowerCase().includes(searchName) ||
        searchName.includes(p.original_name.toLowerCase())
      ))
    );
    
    if (matchingProducts.length > 0) {
      // Trier par longueur de nom (du plus court au plus long) pour privilégier les correspondances plus précises
      matchingProducts.sort((a, b) => {
        const aName = a.name || '';
        const bName = b.name || '';
        return aName.length - bName.length;
      });
      
      logger.info(`Produit trouvé avec correspondance partielle: ${matchingProducts[0].name}`);
      return matchingProducts[0];
    }
    
    logger.info(`Aucun produit trouvé pour: ${name}`);
    return null;
  } catch (error) {
    logger.error(`Erreur lors de la recherche du produit par nom: ${error.message}`);
    return null;
  }
}

/**
 * Enregistrer des éléments d'inventaire
 * @param {Array} items - Éléments d'inventaire à enregistrer
 * @param {string} location - Emplacement
 * @param {string} period - Période (format YYYY-MM)
 * @returns {Promise<Object>} - Résultat de l'enregistrement
 */
async function saveInventoryItems(items, location, period) {
  try {
    if (!Array.isArray(items)) {
      return { success: false, message: 'Les éléments doivent être un tableau' };
    }
    
    if (items.length === 0) {
      return { success: true, message: 'Aucun élément à enregistrer' };
    }
    
    // Si period n'est pas spécifié, utiliser le mois en cours
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // Extraire la location des items si elle n'est pas spécifiée
    if (!location && items[0] && items[0].location) {
      location = items[0].location;
    }
    
    if (!location) {
      return { success: false, message: 'Emplacement non spécifié' };
    }
    
    // Compléter les éléments avec des données manquantes
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const enrichedItem = { ...item };
      
      // Si l'élément a un nom de produit mais pas d'ID, rechercher l'ID
      if (!enrichedItem.productId && enrichedItem.productName) {
        const product = await findProductByName(enrichedItem.productName);
        if (product) {
          enrichedItem.productId = product.id;
          enrichedItem.product_name = product.name;
          enrichedItem.unit = enrichedItem.unit || product.unit;
        }
      } else if (!enrichedItem.productName && enrichedItem.productId) {
        // Si l'élément a un ID mais pas de nom, rechercher le nom
        const products = await getProducts();
        const product = products.find(p => p.id === enrichedItem.productId);
        if (product) {
          enrichedItem.product_name = product.name;
          enrichedItem.unit = enrichedItem.unit || product.unit;
        }
      }
      
      return enrichedItem;
    }));
    
    // Enregistrer dans Google Sheets
    const result = await googleSheetsService.saveInventoryItems(enrichedItems, location, period);
    
    return {
      success: true,
      location,
      period,
      saved: result.saved,
      errors: result.errors
    };
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement des éléments d'inventaire: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Ajouter un nouveau produit ou mettre à jour un produit existant
 * @param {Object} productData - Données du produit
 * @returns {Promise<Object>} - Produit ajouté ou mis à jour
 */
async function addOrUpdateProduct(productData) {
  try {
    if (!productData.name) {
      throw new Error('Le nom du produit est requis');
    }
    
    // Vérifier si le produit existe déjà
    const existingProduct = await findProductByName(productData.name);
    
    if (existingProduct) {
      // Mettre à jour le produit existant
      const updatedProduct = {
        ...existingProduct,
        ...productData,
        id: existingProduct.id
      };
      
      // Enregistrer le produit mis à jour
      const result = await googleSheetsService.saveProduct(updatedProduct);
      
      logger.info(`Produit mis à jour: ${updatedProduct.name}`);
      return result;
    } else {
      // Ajouter un nouveau produit
      const result = await googleSheetsService.saveProduct(productData);
      
      logger.info(`Nouveau produit ajouté: ${productData.name}`);
      return result;
    }
  } catch (error) {
    logger.error(`Erreur lors de l'ajout/mise à jour du produit: ${error.message}`);
    throw error;
  }
}

/**
 * Récupérer l'inventaire pour un emplacement et une période spécifiques
 * @param {string} location - Emplacement
 * @param {string} period - Période (format YYYY-MM)
 * @returns {Promise<Array>} - Éléments d'inventaire
 */
async function getInventory(location, period) {
  try {
    if (!location) {
      throw new Error('Emplacement requis');
    }
    
    // Si period n'est pas spécifié, utiliser le mois en cours
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    return await googleSheetsService.getInventory(location, period);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'inventaire: ${error.message}`);
    return [];
  }
}

/**
 * Enregistrer des éléments non reconnus pour examen ultérieur
 * @param {Array} items - Éléments non reconnus
 * @param {string} location - Emplacement
 * @returns {Promise<Object>} - Résultat
 */
async function saveUnknownItems(items, location) {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: true, message: 'Aucun élément inconnu à enregistrer' };
    }
    
    // Créer le répertoire des éléments inconnus si nécessaire
    const unknownDir = path.join(__dirname, '../data/unknown-items');
    await fs.mkdir(unknownDir, { recursive: true });
    
    // Créer un fichier pour les éléments inconnus
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filePath = path.join(unknownDir, `unknown_${location}_${timestamp}.json`);
    
    await fs.writeFile(filePath, JSON.stringify({
      timestamp,
      location,
      items
    }, null, 2), 'utf8');
    
    logger.info(`${items.length} éléments inconnus enregistrés dans ${filePath}`);
    
    return {
      success: true,
      saved: items.length,
      file: filePath
    };
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement des éléments inconnus: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Obtenir des statistiques d'inventaire
 * @param {string} location - Emplacement (optionnel)
 * @param {number} months - Nombre de mois à inclure
 * @returns {Promise<Object>} - Statistiques d'inventaire
 */
async function getInventoryStats(location, months = 3) {
  try {
    const stats = {
      totalProducts: 0,
      mostTrackedProducts: [],
      inventoryByLocation: {},
      inventoryTrends: []
    };
    
    // Récupérer tous les produits
    const products = await getProducts(location);
    stats.totalProducts = products.length;
    
    // Récupérer les périodes récentes
    const periods = [];
    const now = new Date();
    
    for (let i = 0; i < months; i++) {
      const date = new Date(now);
      date.setMonth(now.getMonth() - i);
      periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    
    // Si un emplacement est spécifié, récupérer seulement les données pour cet emplacement
    if (location) {
      const inventoryData = [];
      
      for (const period of periods) {
        const inventory = await googleSheetsService.getInventory(location, period);
        inventoryData.push({ period, location, data: inventory });
      }
      
      stats.inventoryTrends = inventoryData;
    } else {
      // Récupérer les données pour tous les emplacements configurés
      const locations = [...config.voiceProcessing.locations];
      
      for (const loc of locations) {
        stats.inventoryByLocation[loc] = {
          totalItems: 0,
          recentInventory: null
        };
        
        // Récupérer l'inventaire le plus récent
        const recentInventory = await googleSheetsService.getInventory(loc, periods[0]);
        stats.inventoryByLocation[loc].totalItems = recentInventory.length;
        stats.inventoryByLocation[loc].recentInventory = recentInventory;
      }
    }
    
    return stats;
  } catch (error) {
    logger.error(`Erreur lors de la récupération des statistiques d'inventaire: ${error.message}`);
    return { error: error.message };
  }
}

module.exports = {
  getProducts,
  findProductByName,
  saveInventoryItems,
  addOrUpdateProduct,
  getInventory,
  saveUnknownItems,
  getInventoryStats
};
