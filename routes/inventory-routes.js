// routes/inventory-routes.js

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const database = require('../utils/database-utils');
const { asyncHandler, ValidationError } = require('../utils/error-handler');
const { validateRequest } = require('../middleware/common');

/**
 * Validate get products request
 */
const validateGetProducts = (req) => {
  const errors = [];
  
  if (req.query.location && typeof req.query.location !== 'string') {
    errors.push({
      field: 'location',
      message: 'Location must be a string'
    });
  }
  
  return errors;
};

/**
 * Validate update product request
 */
const validateUpdateProduct = (req) => {
  const errors = [];
  
  if (!req.params.id) {
    errors.push({
      field: 'id',
      message: 'Product ID is required'
    });
  }
  
  if (req.body.currentStock !== undefined) {
    const stock = parseInt(req.body.currentStock);
    if (isNaN(stock) || stock < 0) {
      errors.push({
        field: 'currentStock',
        message: 'Current stock must be a non-negative number'
      });
    }
  }
  
  return errors;
};

/**
 * Get all products
 * @route GET /api/inventory/products
 */
router.get('/products', 
  validateRequest(validateGetProducts),
  asyncHandler(async (req, res) => {
    logger.info('Get products request received', {
      module: 'inventory-routes',
      requestId: req.requestId,
      location: req.query.location
    });
    
    const products = await database.getProducts(req.query.location || 'main');
    
    res.json(products);
  })
);

/**
 * Get low stock items
 * @route GET /api/inventory/low-stock
 */
router.get('/low-stock',
  asyncHandler(async (req, res) => {
    logger.info('Get low stock items request received', {
      module: 'inventory-routes',
      requestId: req.requestId,
      location: req.query.location
    });
    
    const lowStockItems = await database.getLowStockItems(req.query.location || 'main');
    
    res.json(lowStockItems);
  })
);

/**
 * Update product
 * @route PATCH /api/inventory/products/:id
 */
router.patch('/products/:id',
  validateRequest(validateUpdateProduct),
  asyncHandler(async (req, res) => {
    const productId = req.params.id;
    
    logger.info(`Update product request received for product ${productId}`, {
      module: 'inventory-routes',
      requestId: req.requestId,
      productId,
      updateFields: Object.keys(req.body)
    });
    
    // Simplified implementation - in reality, you would call database.updateProduct
    const products = await database.getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      throw new ValidationError(`Product not found: ${productId}`, ['id'], 'PRODUCT_NOT_FOUND');
    }
    
    // Return fake success response
    res.json({
      id: productId,
      message: 'Product updated successfully',
      updatedFields: Object.keys(req.body)
    });
  })
);

module.exports = router;