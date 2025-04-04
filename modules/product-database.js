/**
 * Product Database Module
 * Handles product database operations
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { findProductByName } = require('../utils/database-utils');

/**
 * Save product to local file
 * @param {Object} product - Product object
 * @returns {Object} - Saved product object
 */
function saveProduct(product) {
  const filePath = path.join(__dirname, '../data/products.json');
  let products = [];

  // Read existing products from file
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    products = JSON.parse(fileContent);
  }

  // Check if product already exists
  const existingProduct = products.find((p) => p.name.toLowerCase() === product.name.toLowerCase());

  if (existingProduct) {
    // Update existing product
    Object.assign(existingProduct, product);
  } else {
    // Add new product
    products.push(product);
  }

  // Save updated products to file
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
  logger.info(`Produit ${existingProduct ? 'mis à jour' : 'créé'} et sauvegardé dans le fichier local: ${product.name}`);
  
  return product; // Ensure return is inside the function
}

module.exports = {
  saveProduct,
};