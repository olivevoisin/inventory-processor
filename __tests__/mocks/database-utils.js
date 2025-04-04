// Mock pour les fonctions d'accès à la base de données
const databaseUtilsMock = {
  // Fonctions de gestion des utilisateurs
  getUserById: jest.fn().mockImplementation((id) => {
    if (id === 'user123' || id === 'admin456') {
      return Promise.resolve({
        _id: id,
        name: id === 'user123' ? 'Utilisateur Test' : 'Admin Test',
        email: id === 'user123' ? 'user@example.com' : 'admin@example.com',
        roles: id === 'user123' ? ['user'] : ['admin', 'user'],
        locations: id === 'user123' ? ['boissonMaison'] : ['boissonMaison', 'boissonBicoque', 'cuisineMaison', 'cuisineBicoque'],
        active: true,
        passwordChangedAt: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01')
      });
    }
    return Promise.resolve(null);
  }),
  
  getUserByEmail: jest.fn().mockImplementation((email) => {
    if (email === 'user@example.com' || email === 'admin@example.com') {
      return Promise.resolve({
        _id: email === 'user@example.com' ? 'user123' : 'admin456',
        name: email === 'user@example.com' ? 'Utilisateur Test' : 'Admin Test',
        email,
        password: '$2a$12$aBcDeFgHiJkLmNoPqRsTuVwXyZ',
        roles: email === 'user@example.com' ? ['user'] : ['admin', 'user'],
        locations: email === 'user@example.com' ? ['boissonMaison'] : ['boissonMaison', 'boissonBicoque', 'cuisineMaison', 'cuisineBicoque'],
        active: true
      });
    }
    return Promise.resolve(null);
  }),
  
  verifyPassword: jest.fn().mockImplementation((password, hash) => {
    return Promise.resolve(password === 'password123');
  }),
  
  createUser: jest.fn().mockImplementation((userData) => {
    return Promise.resolve({
      _id: 'newuser789',
      ...userData,
      createdAt: new Date()
    });
  }),
  
  updateUser: jest.fn().mockImplementation((id, updateData) => {
    return Promise.resolve({
      _id: id,
      name: updateData.name || 'Utilisateur Test',
      email: 'user@example.com',
      roles: ['user'],
      locations: ['boissonMaison'],
      active: updateData.active !== undefined ? updateData.active : true,
      ...updateData
    });
  }),
  
  deleteUser: jest.fn().mockResolvedValue(true),
  
  getUsers: jest.fn().mockResolvedValue([
    {
      _id: 'user123',
      name: 'Utilisateur Test',
      email: 'user@example.com',
      roles: ['user'],
      locations: ['boissonMaison'],
      active: true
    },
    {
      _id: 'admin456',
      name: 'Admin Test',
      email: 'admin@example.com',
      roles: ['admin', 'user'],
      locations: ['boissonMaison', 'boissonBicoque', 'cuisineMaison', 'cuisineBicoque'],
      active: true
    }
  ]),
  
  generatePasswordResetToken: jest.fn().mockResolvedValue('resettoken123'),
  
  resetPasswordWithToken: jest.fn().mockImplementation((token, newPassword) => {
    if (token === 'resettoken123') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve({ success: false, message: 'Token invalide ou expiré' });
  }),
  
  // Fonctions de gestion des produits
  getProducts: jest.fn().mockResolvedValue([
    { id: '1', name: 'Vin Rouge', unit: 'bouteille', price: '15.99' },
    { id: '2', name: 'Bière Blonde', unit: 'cannette', price: '2.50' },
    { id: '3', name: 'Vodka Grey Goose', unit: 'bouteille', price: '45.00' }
  ]),
  
  findProductByName: jest.fn().mockImplementation((name) => {
    const products = {
      'vin rouge': { id: '1', name: 'Vin Rouge', unit: 'bouteille', price: '15.99' },
      'bière blonde': { id: '2', name: 'Bière Blonde', unit: 'cannette', price: '2.50' },
      'vodka': { id: '3', name: 'Vodka Grey Goose', unit: 'bouteille', price: '45.00' }
    };
    
    const nameLower = name.toLowerCase();
    for (const [key, product] of Object.entries(products)) {
      if (key.includes(nameLower) || nameLower.includes(key)) {
        return Promise.resolve(product);
      }
    }
    
    return Promise.resolve(null);
  }),
  
  addProduct: jest.fn().mockImplementation((product) => {
    return Promise.resolve({
      id: '4',
      ...product,
      createdAt: new Date()
    });
  }),
  
  // Fonctions de gestion de l'inventaire
  getInventory: jest.fn().mockImplementation((location, period) => {
    return Promise.resolve([
      { product: 'Vin Rouge', quantity: 10, unit: 'bouteille', date: '2023-03-01', location: location || 'boissonMaison' },
      { product: 'Bière Blonde', quantity: 24, unit: 'cannette', date: '2023-03-01', location: location || 'boissonMaison' }
    ]);
  }),
  
  saveInventoryItems: jest.fn().mockImplementation((data) => {
    return Promise.resolve({
      success: true,
      savedItems: data.items || [],
      errors: []
    });
  }),
  
  getInventoryHistory: jest.fn().mockResolvedValue([
    { period: '2023-02', location: 'boissonMaison', date: '2023-02-28', items: 15 },
    { period: '2023-01', location: 'boissonMaison', date: '2023-01-31', items: 12 }
  ]),
  
  // Fonctions de gestion des factures
  getInvoiceById: jest.fn().mockImplementation((id) => {
    if (id === 'inv123') {
      return Promise.resolve({
        id: 'inv123',
        date: '2023-03-15',
        supplier: 'Fournisseur Test',
        total: '256.75',
        items: [
          { product: 'Vin Rouge', quantity: 5, unit: 'bouteille', price: '15.99' },
          { product: 'Bière Blonde', quantity: 10, unit: 'cannette', price: '2.50' }
        ]
      });
    }
    return Promise.resolve(null);
  }),
  
  getInvoiceHistory: jest.fn().mockResolvedValue([
    { id: 'inv123', date: '2023-03-15', supplier: 'Fournisseur Test', totalItems: 15 },
    { id: 'inv456', date: '2023-02-28', supplier: 'Autre Fournisseur', totalItems: 8 }
  ]),
  
  saveInvoice: jest.fn().mockImplementation((invoice) => {
    return Promise.resolve({
      id: 'newInv789',
      ...invoice,
      date: invoice.date || new Date().toISOString().split('T')[0]
    });
  })
};

module.exports = databaseUtilsMock;
