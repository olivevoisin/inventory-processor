/**
 * Tests for invoice-service module
 */
const fs = require('fs').promises;
const path = require('path');
const invoiceService = require('../../modules/invoice-service');
const invoiceProcessor = require('../../modules/invoice-processor'); // Corrected path
const translationService = require('../../modules/translation-service');
const dbUtils = require('../../utils/database-utils');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn(),
    rename: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true })
  }
}));

jest.mock('../../modules/invoice-processor', () => ({ // Corrected path
  extractInvoiceData: jest.fn(),
  processInvoice: jest.fn() // Assuming processInvoice might be needed
}));

jest.mock('../../modules/translation-service', () => ({
  translateItems: jest.fn()
}));

jest.mock('../../utils/database-utils', () => ({
  saveInvoice: jest.fn().mockResolvedValue({ success: true, id: 'inv-123' }),
  saveInventoryItems: jest.fn().mockResolvedValue({ success: true, savedCount: 2 }),
  findProductByName: jest.fn(),
  addProduct: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Invoice Service Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processInvoices', () => {
    test('should process all PDF invoices in directory', async () => {
      // Arrange
      const sourceDir = '/path/to/invoices';
      const processedDir = '/path/to/invoices/processed';
      
      // Mock file system operations
      fs.readdir.mockResolvedValueOnce([
        'invoice1.pdf',
        'invoice2.pdf',
        'document.docx' // Non-PDF file that should be ignored
      ]);
      
      // Mock invoice processor responses
      invoiceProcessor.extractInvoiceData.mockResolvedValueOnce({
        invoiceDate: '2023-01-15',
        items: [{ product: 'Wine', count: 5 }],
        total: '€150'
      });
      
      invoiceProcessor.extractInvoiceData.mockResolvedValueOnce({
        invoiceDate: '2023-01-16',
        items: [{ product: 'Beer', count: 10 }],
        total: '€50'
      });
      
      // Mock translation service
      translationService.translateItems.mockImplementation(items => items);
      
      // Execute
      const result = await invoiceService.processInvoices(sourceDir, processedDir);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
      
      // Verify directory creation
      expect(fs.mkdir).toHaveBeenCalledWith(processedDir, { recursive: true });
      
      // Verify file reading
      expect(fs.readdir).toHaveBeenCalledWith(sourceDir);
      
      // Verify processing of each invoice
      expect(invoiceProcessor.extractInvoiceData).toHaveBeenCalledTimes(2);
      
      // Verify saving to database
      expect(dbUtils.saveInvoice).toHaveBeenCalledTimes(2);
      expect(dbUtils.saveInventoryItems).toHaveBeenCalledTimes(2);
      
      // Verify file movement
      expect(fs.rename).toHaveBeenCalledTimes(2);
      expect(fs.rename).toHaveBeenCalledWith(
        `${sourceDir}/invoice1.pdf`,
        `${processedDir}/invoice1.pdf`
      );
      expect(fs.rename).toHaveBeenCalledWith(
        `${sourceDir}/invoice2.pdf`,
        `${processedDir}/invoice2.pdf`
      );
    });
    
    test('should handle empty directory gracefully', async () => {
      // Arrange
      const sourceDir = '/path/to/empty';
      const processedDir = '/path/to/empty/processed';
      
      // Mock empty directory
      fs.readdir.mockResolvedValueOnce([]);
      
      // Execute
      const result = await invoiceService.processInvoices(sourceDir, processedDir);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      
      // Verify directory creation still happened
      expect(fs.mkdir).toHaveBeenCalledWith(processedDir, { recursive: true });
      
      // Verify no processing occurred
      expect(invoiceProcessor.extractInvoiceData).not.toHaveBeenCalled();
      expect(dbUtils.saveInvoice).not.toHaveBeenCalled();
      expect(dbUtils.saveInventoryItems).not.toHaveBeenCalled();
      expect(fs.rename).not.toHaveBeenCalled();
    });
    
    test('should handle errors during processing and continue with other files', async () => {
      // Arrange
      const sourceDir = '/path/to/invoices';
      const processedDir = '/path/to/invoices/processed';
      
      // Mock file system operations
      fs.readdir.mockResolvedValueOnce([
        'invoice1.pdf',
        'error_invoice.pdf',
        'invoice3.pdf'
      ]);
      
      // Mock successful processing for first and third invoices
      invoiceProcessor.extractInvoiceData.mockResolvedValueOnce({
        invoiceDate: '2023-01-15',
        items: [{ product: 'Wine', count: 5 }],
        total: '€150'
      });
      
      // Mock failure for second invoice
      invoiceProcessor.extractInvoiceData.mockRejectedValueOnce(
        new Error('OCR failed for this invoice')
      );
      
      // Mock success for third invoice
      invoiceProcessor.extractInvoiceData.mockResolvedValueOnce({
        invoiceDate: '2023-01-17',
        items: [{ product: 'Vodka', count: 2 }],
        total: '€60'
      });
      
      // Mock translation service
      translationService.translateItems.mockImplementation(items => items);
      
      // Execute
      const result = await invoiceService.processInvoices(sourceDir, processedDir);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2); // Two successful, one failed
      expect(result.errors).toBe(1);
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing invoice error_invoice.pdf'),
        expect.anything()
      );
      
      // Verify processing continued after error
      expect(invoiceProcessor.extractInvoiceData).toHaveBeenCalledTimes(3);
      expect(dbUtils.saveInvoice).toHaveBeenCalledTimes(2);
      expect(fs.rename).toHaveBeenCalledTimes(2);
    });
    
    test('should handle errors in file system operations', async () => {
      // Arrange
      const sourceDir = '/path/to/invoices';
      const processedDir = '/path/to/invoices/processed';
      
      // Mock directory creation failure
      fs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      
      // Execute
      const result = await invoiceService.processInvoices(sourceDir, processedDir);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.message).toBe('Permission denied');
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invoice processing failed'),
        expect.anything()
      );
      
      // Verify no further processing occurred
      expect(fs.readdir).not.toHaveBeenCalled();
      expect(invoiceProcessor.extractInvoiceData).not.toHaveBeenCalled();
    });
  });

  describe('processSingleInvoice', () => {
    test('should process a single invoice file successfully', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      const location = 'Bar';
      
      // Mock invoice processor
      invoiceProcessor.extractInvoiceData.mockResolvedValueOnce({
        invoiceDate: '2023-01-15',
        items: [
          { product: 'ワイン', count: 5, price: '15000円' },
          { product: 'ビール', count: 10, price: '5000円' }
        ],
        total: '20000円',
        supplier: 'Tokyo Beverages'
      });
      
      // Mock translation service
      translationService.translateItems.mockResolvedValueOnce([
        { product: 'Wine', count: 5, price: '15000円' },
        { product: 'Beer', count: 10, price: '5000円' }
      ]);
      
      // Mock product lookup (first product exists, second doesn't)
      dbUtils.findProductByName.mockResolvedValueOnce({
        name: 'Wine',
        unit: 'bottle',
        price: '29.99'
      });
      dbUtils.findProductByName.mockResolvedValueOnce(null);
      
      // Execute
      const result = await invoiceService.processSingleInvoice(filePath, location);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.location).toBe('Bar');
      
      // Verify calls
      expect(invoiceProcessor.extractInvoiceData).toHaveBeenCalledWith(filePath);
      expect(translationService.translateItems).toHaveBeenCalled();
      
      // Verify product lookup
      expect(dbUtils.findProductByName).toHaveBeenCalledTimes(2);
      
      // Verify new product was added
      expect(dbUtils.addProduct).toHaveBeenCalledTimes(1);
      expect(dbUtils.addProduct).toHaveBeenCalledWith({
        name: 'Beer',
        unit: 'bottle',
        price: '500.00',
        location: 'Bar'
      });
    });
    
    test('should handle errors during invoice processing', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      const location = 'Bar';
      
      // Mock invoice processor error
      invoiceProcessor.extractInvoiceData.mockRejectedValueOnce(
        new Error('Failed to extract data from PDF')
      );
      
      // Execute and assert
      await expect(
        invoiceService.processSingleInvoice(filePath, location)
      ).rejects.toThrow('Failed to extract data from PDF');
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing invoice'),
        expect.anything()
      );
      
      // Verify no further processing occurred
      expect(translationService.translateItems).not.toHaveBeenCalled();
      expect(dbUtils.findProductByName).not.toHaveBeenCalled();
      expect(dbUtils.addProduct).not.toHaveBeenCalled();
    });
    
    test('should handle translation service errors', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      const location = 'Bar';
      
      // Mock invoice processor
      invoiceProcessor.extractInvoiceData.mockResolvedValueOnce({
        invoiceDate: '2023-01-15',
        items: [{ product: 'ワイン', count: 5, price: '15000円' }],
        total: '15000円'
      });
      
      // Mock translation service error
      translationService.translateItems.mockRejectedValueOnce(
        new Error('Translation service unavailable')
      );
      
      // Execute and assert
      await expect(
        invoiceService.processSingleInvoice(filePath, location)
      ).rejects.toThrow('Translation service unavailable');
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing invoice'),
        expect.anything()
      );
    });
    
    test('should handle case when adding a product fails', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      const location = 'Bar';
      
      // Mock invoice processor
      invoiceProcessor.extractInvoiceData.mockResolvedValueOnce({
        invoiceDate: '2023-01-15',
        items: [{ product: 'ワイン', count: 5, price: '15000円' }],
        total: '15000円'
      });
      
      // Mock translation service
      translationService.translateItems.mockResolvedValueOnce([
        { product: 'Wine', count: 5, price: '15000円' }
      ]);
      
      // Mock product lookup - product doesn't exist
      dbUtils.findProductByName.mockResolvedValueOnce(null);
      
      // Mock addProduct to fail
      dbUtils.addProduct.mockRejectedValueOnce(
        new Error('Failed to add product to database')
      );
      
      // Execute and assert
      await expect(
        invoiceService.processSingleInvoice(filePath, location)
      ).rejects.toThrow('Failed to add product to database');
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing invoice'),
        expect.anything()
      );
    });
    
    test('should handle case with missing price in invoice items', async () => {
      // Arrange
      const filePath = '/path/to/invoice.pdf';
      const location = 'Bar';
      
      // Mock invoice processor with no prices
      invoiceProcessor.extractInvoiceData.mockResolvedValueOnce({
        invoiceDate: '2023-01-15',
        items: [{ product: 'ワイン', count: 5 }], // No price
        total: '15000円'
      });
      
      // Mock translation service
      translationService.translateItems.mockResolvedValueOnce([
        { product: 'Wine', count: 5 } // No price
      ]);
      
      // Mock product lookup - product doesn't exist
      dbUtils.findProductByName.mockResolvedValueOnce(null);
      
      // Execute
      const result = await invoiceService.processSingleInvoice(filePath, location);
      
      // Assert
      expect(result).toBeDefined();
      
      // Verify default price was used (39.99)
      expect(dbUtils.addProduct).toHaveBeenCalledWith({
        name: 'Wine',
        unit: 'bottle',
        price: '39.99', // Default price
        location: 'Bar'
      });
    });
  });
});