/**
 * Routes d'authentification
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { ValidationError, AuthenticationError } = require('../utils/error-handler');
const logger = require('../utils/logger');
const config = require('../config');

// Secret pour signer le token
const JWT_SECRET = config.auth?.jwtSecret || process.env.JWT_SECRET || 'jwt_secret_for_testing';

/**
 * @route POST /api/auth/login
 * @desc Authentification d'un utilisateur
 * @access Public
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      throw new ValidationError('Nom d\'utilisateur et mot de passe requis');
    }
    
    // Simuler une vérification d'identifiants pour les tests
    // Dans un environnement réel, vérifier dans la base de données
    if (username === 'admin' && password === 'password') {
      // Créer un token JWT
      const token = jwt.sign(
        { id: 'user_1', username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: 'user_1',
          username,
          role: 'admin'
        }
      });
    }
    
    throw new AuthenticationError('Identifiants invalides');
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/auth/verify
 * @desc Vérifie un token JWT
 * @access Public
 */
router.get('/verify', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AuthenticationError('Token non fourni');
    }
    
    try {
      // Vérifier le token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      return res.status(200).json({
        success: true,
        user: decoded
      });
    } catch (err) {
      throw new AuthenticationError('Token invalide');
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Rafraîchit un token JWT
 * @access Public
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      throw new ValidationError('Token requis');
    }
    
    try {
      // Vérifier le token actuel
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
      
      // Générer un nouveau token
      const newToken = jwt.sign(
        { id: decoded.id, username: decoded.username, role: decoded.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      return res.status(200).json({
        success: true,
        token: newToken,
        user: {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role
        }
      });
    } catch (err) {
      throw new AuthenticationError('Token invalide');
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
