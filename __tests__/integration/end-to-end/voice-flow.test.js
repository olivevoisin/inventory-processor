/**
 * Test de flux complet du traitement des factures
 */
const fs = require('fs');
const invoiceService = require('../../../modules/invoice-service');
const invoiceProcessor = require('../../../modules/invoice-processor');
const database = require('../../../utils/database-utils');

// Mocker les dépendances
jest.mock('fs');
jest.mock('../../../modules/invoice-processor');
jest.mock('../../../utils/database-utils');

// Configuration pour les tests
const sourceDir = './data/invoices';
const processedDir = './data/invoices/processed';

describe('Invoice Processing End-to-End Flow', () => {
  beforeEach(() => {
    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
    
    // Simuler des fichiers de facture
    fs.promises.readdir.mockResolvedValue(['invoice1.pdf', 'invoice2.pdf', 'test.txt']);
    
    // Simuler le traitement des factures
    invoiceProcessor.processInvoice.mockResolvedValue({
      invoiceId: 'INV-001',
      invoiceDate: '2023-01-15',
      supplier: 'Test Supplier',
      items: [
        { product: 'Vodka Grey Goose', count: 5, price: '14,995' },
        { product: 'Wine Cabernet', count: 10, price: '15,990' }
      ]
    });
    
    // Simuler les opérations de base de données
    database.saveInvoice.mockResolvedValue({ id: 'INV-001' });
    database.saveInventoryItems.mockResolvedValue({ success: true });
  });
  
  test('should process invoices from start to finish', async () => {
    // Exécuter le flux
    await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Verify processing steps
    expect(fs.promises.readdir).toHaveBeenCalled();
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
    expect(database.saveInvoice).toHaveBeenCalled();
    
    // Vérifier que le déplacement des fichiers a été fait
    expect(fs.promises.rename).toHaveBeenCalled();
  });
  
  test('should handle empty directory gracefully', async () => {
    // Simuler un répertoire vide
    fs.promises.readdir.mockResolvedValue([]);
    
    // Exécuter le flux
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Verify result
    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
  });
  
  test('should add translated items to inventory', async () => {
    // Simuler une facture avec des éléments traduits
    invoiceProcessor.processInvoice.mockResolvedValue({
      invoiceId: 'INV-002',
      invoiceDate: '2023-01-20',
      supplier: 'Japanese Supplier',
      items: [
        { product: 'ウォッカ グレイグース', count: 3, price: '8,997' },
        { product: 'ワイン カベルネ', count: 6, price: '9,594' }
      ]
    });
    
    // Exécuter le traitement d'une seule facture
    const result = await invoiceService.processSingleInvoice('sample.pdf', 'Bar');
    
    // Verify
    expect(database.saveInvoice).toHaveBeenCalled();
    expect(database.saveInventoryItems).toHaveBeenCalled();
    expect(result).toHaveProperty('invoiceId');
  });
});
