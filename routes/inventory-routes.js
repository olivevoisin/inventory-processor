/**
 * Inventory management API endpoints
 */
const express = require('express');
const router = express.Router();
const dbUtils = require('../utils/database-utils');
const { authenticateApiKey } = require('../middleware/auth');
const { validateRequestBody } = require('../middleware/validation');
const logger = require('../utils/logger');
const monitoring = require('../utils/monitoring');

/**
 * @route GET /api/inventory/products
 * @desc Get all products
 * @access Protected
 */
router.get('/products', authenticateApiKey, async (req, res) => {
  try {
    monitoring.recordApiUsage('getProducts');
    logger.info('Request for all products');
    
    const products = await dbUtils.getProducts();
    return res.status(200).json(products);
  } catch (error) {
    logger.error(`Error getting products: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

/**
 * @route GET /api/inventory
 * @desc Get inventory by location
 * @access Protected
 */
router.get('/', authenticateApiKey, async (req, res) => {
  try {
    const { location } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is required' });
    }
    
    monitoring.recordApiUsage('getInventory');
    logger.info(`Request for inventory at location: ${location}`);
    
    const inventory = await dbUtils.getInventoryByLocation(location);
    return res.status(200).json(inventory);
  } catch (error) {
    logger.error(`Error getting inventory: ${error.message}`);
    return res.status(500).json({ error: 'Failed to retrieve inventory' });
  }
});

/**
 * @route POST /api/inventory
 * @desc Update inventory items
 * @access Protected
 */
router.post('/', 
  authenticateApiKey, 
  validateRequestBody(['productId', 'quantity', 'location']),
  async (req, res) => {
    try {
      const inventoryItems = req.body;
      
      if (!Array.isArray(inventoryItems)) {
        return res.status(400).json({ error: 'Request body must be an array of inventory items' });
      }
      
      monitoring.recordApiUsage('updateInventory');
      logger.info(`Request to update ${inventoryItems.length} inventory items`);
      
      const result = await dbUtils.saveInventoryItems(inventoryItems);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      logger.error(`Error updating inventory: ${error.message}`);
      return res.status(500).json({ error: 'Failed to update inventory' });
    }
  }
);

module.exports = router;
