/**
 * Inventory Routes
 */
const express = require('express');
const router = express.Router();
const dbUtils = require('../utils/database-utils');
const logger = require('../utils/logger');

// Get all inventory data
router.get('/', async (req, res) => {
  try {
    const { location, startDate, endDate } = req.query;
    
    // In a real implementation, this would query the database
    // with proper filtering
    const inventoryData = await dbUtils.getInventory(location, startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: inventoryData
    });
  } catch (error) {
    logger.error(`Get inventory error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const { location } = req.query;
    
    const products = await dbUtils.getProducts(location);
    
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    logger.error(`Get products error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add a new product
router.post('/products', async (req, res) => {
  try {
    const productData = req.body;
    
    if (!productData.name || !productData.unit) {
      return res.status(400).json({
        success: false,
        error: 'Product name and unit are required'
      });
    }
    
    const result = await dbUtils.addProduct(productData);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Add product error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add inventory data
router.post('/', async (req, res) => {
  try {
    const inventoryData = req.body;
    
    if (!inventoryData.location || !inventoryData.items) {
      return res.status(400).json({
        success: false,
        error: 'Location and items are required'
      });
    }
    
    const result = await dbUtils.saveInventoryItems(inventoryData);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Add inventory error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
