const express = require('express');
const router = express.Router();
const database = require('../utils/database-utils');
const { authenticateApiKey } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get all products
router.get('/products', authenticateApiKey, async (req, res) => {
  try {
    const location = req.query.location;
    const products = await database.getProducts(location);
    
    // Return data in a consistent format with a data property
    res.json({ 
      success: true,
      data: products 
    });
  } catch (error) {
    logger.error(`Error getting products: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Error getting products'
    });
  }
});

// Get inventory by location
router.get('/', authenticateApiKey, async (req, res) => {
  try {
    const location = req.query.location;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required'
      });
    }
    
    const inventory = await database.getInventoryByLocation(location);
    
    // Return data in a consistent format with a data property
    res.json({
      success: true, 
      data: inventory 
    });
  } catch (error) {
    logger.error(`Error getting inventory: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Error getting inventory'
    });
  }
});

// Save inventory items
router.post('/', authenticateApiKey, async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Request body must be an array of items' });
    }

    const result = await database.saveInventoryItems(items);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`Error saving inventory items: ${error.message}`);
    res.status(500).json({ success: false, error: 'Error saving inventory items' });
  }
});

module.exports = router;