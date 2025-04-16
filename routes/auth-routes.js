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

// Mock user data
const users = [
  { id: 'user_1', username: 'admin', password: 'password', role: 'admin' }
];

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
    
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ success: true, token });
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.status(200).json({ success: true, user: decoded });
    } catch (err) {
      res.status(401).json({ success: false, message: 'Invalid token' });
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
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
      const newToken = jwt.sign({ id: decoded.id, username: decoded.username, role: decoded.role }, JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ success: true, token: newToken });
    } catch (err) {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
