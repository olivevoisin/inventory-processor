  logger.info(`Produit ${existingProduct ? 'mis à jour' : 'créé'} et sauvegardé dans le fichier local: ${product.name}`);
  
  return product;
}

/**
 * Supprime un produit
 * @param {string} productId - ID du produit à supprimer
 * @returns {Promise<boolean>} - Succès de la suppression
 */
async function deleteProduct(productId) {
  try {
    if (!productId) {
      throw new Error('ID du produit requis');
    }
    
    // Si Google Sheets est activé
    if (config.googleSheets.enabled && googleSheetsService.isConnected()) {
      // Note: Cette fonction n'est pas encore implémentée dans google-sheets-service.js
      // Il faudrait l'ajouter pour une implémentation complète
      logger.warn('Suppression de produit non implémentée pour Google Sheets');
      return false;
    }
    
    // Sinon, supprimer du fichier local
    let products = await loadProductsFromFile();
    
    // Vérifier si le produit existe
    const initialLength = products.length;
    products = products.filter(product => product.id !== productId);
    
    if (products.length === initialLength) {
      logger.info(`Produit ${productId} non trouvé pour suppression`);
      return false;
    }
    
    // Chemin du fichier
    const filePath = path.join(__dirname, '../data/products.json');
    
    // Écrire le fichier
    await fs.writeFile(filePath, JSON.stringify(products, null, 2), 'utf8');
    
    // Mettre à jour le cache
    productsCache = products;
    lastCacheUpdate = Date.now();
    
    logger.info(`Produit ${productId} supprimé avec succès`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la suppression du produit: ${error.message}`);
    return false;
  }
}

/**
 * Met à jour les prix des produits à partir d'une facture
 * @param {Array} invoiceItems - Éléments de la facture
 * @returns {Promise<Object>} - Résultat de la mise à jour
 */
async function updateProductPricesFromInvoice(invoiceItems) {
  try {
    if (!Array.isArray(invoiceItems) || invoiceItems.length === 0) {
      return { success: true, updated: 0, message: 'Aucun élément à traiter' };
    }
    
    const updates = [];
    
    // Traiter chaque élément de la facture
    for (const item of invoiceItems) {
      // Vérifier les données nécessaires
      if (!item.product_name || !item.price || !item.quantity) {
        continue;
      }
      
      // Calculer le prix unitaire si nécessaire
      const unitPrice = item.unitPrice || (item.price / item.quantity);
      
      // Rechercher le produit
      const existingProduct = await getProductByName(item.product_name);
      
      if (existingProduct) {
        // Mettre à jour uniquement si le prix est différent
        if (existingProduct.price !== unitPrice) {
          const updatedProduct = {
            ...existingProduct,
            price: unitPrice,
            previous_price: existingProduct.price,
            price_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Enregistrer le produit mis à jour
          await saveProduct(updatedProduct);
          updates.push({
            id: existingProduct.id,
            name: existingProduct.name,
            oldPrice: existingProduct.price,
            newPrice: unitPrice
          });
        }
      } else {
        // Créer un nouveau produit
        const newProduct = {
          name: item.product_name,
          original_name: item.original_text || '',
          unit: item.unit || 'pièce',
          price: unitPrice,
          supplier: item.supplier || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Enregistrer le nouveau produit
        const savedProduct = await saveProduct(newProduct);
        updates.push({
          id: savedProduct.id,
          name: savedProduct.name,
          newPrice: unitPrice,
          isNew: true
        });
      }
    }
    
    // Mettre à jour le cache
    productsCache = null;
    
    logger.info(`${updates.length} produits mis à jour à partir de la facture`);
    
    return {
      success: true,
      updated: updates.length,
      updates: updates
    };
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour des prix: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Recherche des produits avec filtrage
 * @param {Object} filters - Critères de filtrage
 * @returns {Promise<Array>} - Produits filtrés
 */
async function searchProducts(filters = {}) {
  try {
    // Récupérer tous les produits
    const products = await getProducts();
    
    // Appliquer les filtres
    return products.filter(product => {
      // Filtre par nom
      if (filters.name && !product.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      
      // Filtre par nom original
      if (filters.originalName && 
          (!product.original_name || 
           !product.original_name.toLowerCase().includes(filters.originalName.toLowerCase()))) {
        return false;
      }
      
      // Filtre par unité
      if (filters.unit && product.unit !== filters.unit) {
        return false;
      }
      
      // Filtre par fourchette de prix
      if (filters.minPrice && product.price < filters.minPrice) {
        return false;
      }
      
      if (filters.maxPrice && product.price > filters.maxPrice) {
        return false;
      }
      
      // Filtre par fournisseur
      if (filters.supplier && 
          (!product.supplier || 
           !product.supplier.toLowerCase().includes(filters.supplier.toLowerCase()))) {
        return false;
      }
      
      // Filtre par emplacement
      if (filters.location && product.location !== filters.location) {
        return false;
      }
      
      return true;
    });
  } catch (error) {
    logger.error(`Erreur lors de la recherche de produits: ${error.message}`);
    return [];
  }
}

// Initialiser le module
initialize().catch(err => {
  logger.error(`Erreur lors de l'initialisation de la base de données des produits: ${err.message}`);
});

module.exports = {
  getProducts,
  getProductById,
  getProductByName,
  saveProduct,
  deleteProduct,
  updateProductPricesFromInvoice,
  searchProducts
};
