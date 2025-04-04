const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/auth-routes');
const jwt = require('jsonwebtoken');
const { globalErrorHandler } = require('../../utils/error-handler');

// Mock des dépendances
jest.mock('jsonwebtoken');

// App Express pour les tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(globalErrorHandler);

describe('Routes d\'authentification', () => {
  test('POST /api/auth/login devrait authentifier un utilisateur valide', async () => {
    jwt.sign.mockReturnValue('mock_token');
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.success).toBe(true);
  });
  
  test('POST /api/auth/login devrait refuser un utilisateur invalide', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'invalid', password: 'wrong' });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  test('GET /api/auth/verify devrait vérifier un token valide', async () => {
    jwt.verify.mockReturnValue({ id: 'user_1', username: 'admin', role: 'admin' });
    
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer valid_token');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toHaveProperty('username', 'admin');
  });
  
  test('GET /api/auth/verify devrait rejeter un token invalide', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer invalid_token');
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  test('POST /api/auth/refresh devrait rafraîchir un token valide', async () => {
    jwt.verify.mockReturnValue({ id: 'user_1', username: 'admin', role: 'admin' });
    jwt.sign.mockReturnValue('new_mock_token');
    
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ token: 'valid_token' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBe('new_mock_token');
  });
});
