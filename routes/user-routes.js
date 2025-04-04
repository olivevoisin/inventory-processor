/**
 * User Routes
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const databaseUtils = require('../utils/database-utils');
const { authenticateApiKey } = require('../middleware/auth');

/**
 * Simple middleware to mock role-based authorization
 * @param {Array} roles - List of allowed roles
 * @returns {Function} - Express middleware
 */
const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    // In a real app, we would check user roles from token or session
    // For testing, we'll just assume the role is 'admin'
    const userRole = 'admin';
    
    if (roles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource'
      });
    }
  };
};

/**
 * @route GET /api/users
 * @desc Get all users
 * @access Privé (Admin seulement)
 */
router.get('/', authenticateApiKey, authorizeRoles(['admin']), async (req, res) => {
  try {
    // Mock response for testing
    const users = [
      { id: 1, username: 'admin', role: 'admin' },
      { id: 2, username: 'user', role: 'user' }
    ];
    
    res.status(200).json(users);
  } catch (error) {
    logger.error(`Error getting users: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve users' 
    });
  }
});

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Privé
 */
router.get('/:id', authenticateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    // For testing, return a mock user
    const user = {
      id: parseInt(id, 10),
      username: `user${id}`,
      role: id === '1' ? 'admin' : 'user'
    };
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User with ID ${id} not found`
      });
    }
    
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error getting user: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve user' 
    });
  }
});

/**
 * @route POST /api/users
 * @desc Create new user
 * @access Privé (Admin seulement)
 */
router.post('/', authenticateApiKey, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    // For testing, return a mock created user
    const newUser = {
      id: Math.floor(Math.random() * 1000) + 1,
      username,
      role: role || 'user'
    };
    
    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user' 
    });
  }
});

module.exports = router;
