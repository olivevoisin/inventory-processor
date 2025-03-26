/**
 * Test du workflow de traitement des factures et de traduction
 */
const fs = require('fs');
const invoiceProcessor = require('../../../modules/invoice-processor');
const translationService = require('../../../modules/translation-service');
const databaseUtils = require('../../../utils/database-utils');
const invoiceWorkflow = require('../../../modules/invoice-workflow');

// Mocker les dépendances
jest.mock('fs');
jest.mock('../../../modules/invoice-processor');
jest.mock('../../../modules/translation-service');
jest.mock('../../../utils/database-utils');

// Configuration du test
const sourceDir = './data/invoices';
const processedDir = './data/invoices/processed';

describe('Invoice Processing and Translation Workflow', () => {
  beforeEach(() => {
    // Réinitialiser les mocks
    jest.clearAllMocks();
    
    // Mocker la lecture du répertoire
    fs.promises.readdir.mockResolvedValue([
      'invoice1.pdf',
      'invoice2.pdf',
      'test.txt' // Extension non supportée
    ]);
    
    // Mocker le traitement des factures
    invoiceProcessor.processInvoice.mockResolvedValue({
      invoiceId: 'INV-001',
      invoiceDate: '2023-01-15',
      supplier: 'Test Supplier',
      items: [
        { product: 'Vodka Grey Goose', count: 5, price: '14,995' },
        { product: 'Wine Cabernet', count: 10, price: '15,990' }
      ]
    });
    
    // Mocker la traduction
    translationService.translateItems.mockImplementation(items => {
      return items.map(item => ({
        ...item,
        translated_name: `${item.product} (Translated)`,
        original_name: item.product
      }));
    });
    
    // Mocker les opérations de base de données
    databaseUtils.findProductByName.mockResolvedValue(null);
    databaseUtils.addProduct.mockResolvedValue({ id: 'new-product' });
    databaseUtils.saveInvoice.mockResolvedValue({ id: 'invoice-1' });
    databaseUtils.saveInventoryItems.mockResolvedValue({ success: true });
  });
  
  test('complete invoice processing workflow extracts, translates and stores invoice data', async () => {
    // Exécuter le workflow
    const result = await invoiceWorkflow.processInvoiceDirectory(sourceDir, processedDir);
    
    // 2. Check result
    expect(result.success).toBe(true);
    expect(result.processed).toBeGreaterThan(0);
    
    // 3. Verify all steps were performed
    expect(fs.promises.readdir).toHaveBeenCalled();
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
    expect(translationService.translateItems).toHaveBeenCalled();
    expect(databaseUtils.saveInvoice).toHaveBeenCalled();
    expect(databaseUtils.saveInventoryItems).toHaveBeenCalled();
  });
  
  test('processes a single invoice correctly', async () => {
    // 1. Execute single invoice processing
    const result = await invoiceWorkflow.processSingleInvoice('invoice1.pdf', 'Bar');
    
    // 2. Verify steps and result
    expect(invoiceProcessor.processInvoice).toHaveBeenCalledWith('invoice1.pdf', 'Bar');
    expect(translationService.translateItems).toHaveBeenCalled();
    expect(databaseUtils.saveInvoice).toHaveBeenCalled();
    expect(databaseUtils.saveInventoryItems).toHaveBeenCalled();
    expect(result).toHaveProperty('items');
  });
  
  test('adds new products when not found in database', async () => {
    // 1. Execute with a file containing a new product
    await invoiceWorkflow.processSingleInvoice('__fixtures__/invoices/new-product.pdf', 'Bar');
    
    // 3. Verify product was added
    expect(databaseUtils.addProduct).toHaveBeenCalled();
  });
  
  test('handles extraction errors gracefully', async () => {
    // 1. Override mock for this test to reject with an error
    invoiceProcessor.processInvoice.mockRejectedValueOnce(new Error('OCR failed'));
    
    // 2. Process with error and expect it to be thrown
    await expect(
      invoiceWorkflow.processSingleInvoice('__fixtures__/invoices/failing-ocr.pdf', 'Bar')
    ).rejects.toThrow('OCR failed');
    
    // 3. Verify error handling - saveInvoice should not be called
    expect(databaseUtils.saveInvoice).not.toHaveBeenCalled();
  });
  
  test('handles translation errors gracefully', async () => {
    // 1. Override mock for translation to reject with an error
    translationService.translateItems.mockRejectedValueOnce(new Error('Translation failed'));
    
    // 2. Process with error and expect it to be thrown
    await expect(
      invoiceWorkflow.processSingleInvoice('__fixtures__/invoices/failing-translation.pdf', 'Bar')
    ).rejects.toThrow('Translation failed');
    
    // 4. Verify error handling - saveInvoice should not be called
    expect(databaseUtils.saveInvoice).not.toHaveBeenCalled();
  });
  
  test('handles empty input directory gracefully', async () => {
    // 1. Override mock to return empty directory
    fs.promises.readdir.mockResolvedValueOnce([]);
    
    // 2. Execute workflow
    const result = await invoiceWorkflow.processInvoiceDirectory(sourceDir, processedDir);
    
    // 3. Verify handling of empty directory
    expect(result.success).toBe(true);
    expect(result.processed).toBe(0);
    expect(result.message).toBe('No invoice files found');
  });
});
