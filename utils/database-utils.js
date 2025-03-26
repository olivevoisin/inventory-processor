/**
 * Utilitaires de base de données
 * Gère les opérations de base de données pour l'inventaire
 */
const logger = require('./logger');
const config = require('../config');

// Base de données simulée pour les tests
const mockDB = {
  products: [
    { id: 'prod1', name: 'Vin Rouge', unit: 'bouteille', price: 15.99, location: 'Bar' },
    { id: 'prod2', name: 'Vin Blanc', unit: 'bouteille', price: 14.99, location: 'Bar' },
    { id: 'prod3', name: 'Vodka Grey Goose', unit: 'bouteille', price: 35.99, location: 'Bar' },
    { id: 'prod4', name: 'Bière Blonde', unit: 'cannette', price: 2.99, location: 'Bar' },
    { id: 'prod5', name: 'Whisky', unit: 'bouteille', price: 25.99, location: 'Bar' },
    { id: 'prod6', name: 'Farine', unit: 'kg', price: 1.99, location: 'Cuisine' },
    { id: 'prod7', name: 'Sucre', unit: 'kg', price: 1.49, location: 'Cuisine' },
    { id: 'prod8', name: 'Tomates', unit: 'kg', price: 3.99, location: 'Cuisine' }
  ],
  inventory: [],
  invoices: []
};

/**
 * Recherche un produit par son nom
 * @param {string} name - Nom du produit à rechercher
 * @returns {Promise<Object|null>} - Produit trouvé ou null
 */
async function findProductByName(name) {
  logger.info(`Recherche de produit par nom: ${name}`);
  
  if (!name) return null;
  
  // Normaliser le nom pour la recherche
  const searchName = name.toLowerCase();
  
  // Recherche approximative
  const product = mockDB.products.find(p => 
    p.name.toLowerCase().includes(searchName) || 
    searchName.includes(p.name.toLowerCase())
  );
  
  return product || null;
}

/**
 * Sauvegarde des articles d'inventaire
 * @param {Object} data - Données d'inventaire
 * @returns {Promise<Object>} - Résultat de la sauvegarde
 */
async function saveInventoryItems(data) {
  // S'assurer que data a la bonne structure
  const items = Array.isArray(data) ? data : (data.items || []);
  const location = data.location || 'Bar';
  const date = data.date || new Date().toISOString().split('T')[0];
  
  logger.info(`Sauvegarde de ${items.length} articles d'inventaire pour ${location} (${date})`);
  
  // Ajouter les articles à la base de données simulée
  for (const item of items) {
    const inventoryItem = {
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date,
      location,
      productId: item.productId || null,
      productName: item.name || item.productName || item.product,
      quantity: item.quantity || item.count || 0,
      unit: item.unit || 'unité',
      timestamp: new Date().toISOString()
    };
    
    mockDB.inventory.push(inventoryItem);
  }
  
  return {
    success: true,
    savedCount: items.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Sauvegarde une facture
 * @param {Object} invoice - Données de la facture
 * @returns {Promise<Object>} - Facture sauvegardée avec ID
 */
async function saveInvoice(invoice) {
  logger.info(`Sauvegarde de la facture: ${invoice.invoiceId || 'nouvelle'}`);
  
  const savedInvoice = {
    id: invoice.id || `inv-${Date.now()}`,
    invoiceId: invoice.invoiceId || `INV-${Date.now()}`,
    date: invoice.date || new Date().toISOString().split('T')[0],
    supplier: invoice.supplier || 'Fournisseur inconnu',
    items: invoice.items || [],
    total: invoice.total || '0',
    location: invoice.location || 'Bar',
    timestamp: new Date().toISOString()
  };
  
  mockDB.invoices.push(savedInvoice);
  
  return savedInvoice;
}

/**
 * Ajoute un nouveau produit
 * @param {Object} product - Données du produit
 * @returns {Promise<Object>} - Produit ajouté avec ID
 */
async function addProduct(product) {
  logger.info(`Ajout d'un nouveau produit: ${product.name}`);
  
  const newProduct = {
    id: product.id || `prod-${Date.now()}`,
    name: product.name,
    unit: product.unit || 'unité',
    price: product.price || 0,
    location: product.location || 'Bar',
    timestamp: new Date().toISOString()
  };
  
  mockDB.products.push(newProduct);
  
  return newProduct;
}

/**
 * Récupère tous les produits
 * @param {string} location - Filtre optionnel par emplacement
 * @returns {Promise<Array>} - Liste des produits
 */
async function getProducts(location) {
  logger.info(`Récupération des produits${location ? ` pour ${location}` : ''}`);
  
  if (location) {
    return mockDB.products.filter(p => p.location === location);
  }
  
  return [...mockDB.products];
}

/**
 * Récupère l'inventaire par emplacement
 * @param {string} location - Emplacement à filtrer
 * @returns {Promise<Array>} - Articles d'inventaire
 */
async function getInventoryByLocation(location) {
  logger.info(`Récupération de l'inventaire pour l'emplacement: ${location}`);
  
  if (!location) {
    return mockDB.inventory;
  }
  
  return mockDB.inventory.filter(item => item.location === location);
}

module.exports = {
  findProductByName,
  saveInventoryItems,
  saveInvoice,
  addProduct,
  getProducts,
  getInventoryByLocation
};
