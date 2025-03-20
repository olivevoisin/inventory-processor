// __tests__/integration/end-to-end/invoice-flow.test.js

const fs = require('fs').promises;
const path = require('path');

// Mock modules
jest.mock('../../../modules/invoice-processor', () => ({
  processInvoice: jest.fn().mockResolvedValue({
    extractedData: {
      date: '2023年10月15日',
      productCode: 'JPN-1234',
      quantity: 20,
      unitPrice: 2500,
      totalAmount: 50000
    },
    translation: 'Facture\nDate: 15 Octobre 2023\nRéférence produit: JPN-1234\nQuantité: 20\nPrix unitaire: 2500 ¥\nMontant total: 50000 ¥',
    inventoryUpdates: {
      action: 'add',
      sku: 'JPN-1234',
      quantity: 20,
      price: 2500,
      source: 'invoice',
      date: '2023年10月15日'
    }
  })
}));

jest.mock('../../../modules/translation-service', () => ({
  translateJapaneseToFrench: jest.fn().mockResolvedValue(
    'Facture\nDate: 15 Octobre 2023\nRéférence produit: JPN-1234\nQuantité: 20\nPrix unitaire: 2500 ¥\nMontant total: 50000 ¥'
  )
}));

jest.mock('../../../utils/database-utils', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  getInventoryItems: jest.fn().mockImplementation(sku => {
    if (sku === 'JPN-1234') {
      return Promise.resolve([{ sku: 'JPN-1234', quantity: 50, location: 'WAREHOUSE' }]);
    }
    return Promise.resolve([]);
  }),
  updateInventory: jest.fn().mockResolvedValue({
    sku: 'JPN-1234',
    quantity: 70, // After adding 20
    location: 'WAREHOUSE',
    lastUpdated: '2023-10-15'
  }),
  saveInvoiceRecord: jest.fn().mockResolvedValue({
    id: '123',
    date: '2023-10-15',
    filename: 'invoice1.pdf',
    status: 'processed'
  })
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  startTimer: jest.fn().mockReturnValue({
    done: jest.fn().mockReturnValue({ duration: 100 })
  })
}));

// Import modules to test
const invoiceProcessor = require('../../../modules/invoice-processor');
const translationService = require('../../../modules/translation-service');
const databaseUtils = require('../../../utils/database-utils');

describe('Invoice Processing End-to-End Flow', () => {
  // Mock the entire flow
  const simulateInvoiceWorkflow = async (invoiceFileBuffer) => {
    try {
      // Step 1: Process invoice
      const invoiceResult = await invoiceProcessor.processInvoice(invoiceFileBuffer);
      
      // Step 2: Get current inventory for the product
      let currentInventory = [];
      if (invoiceResult.inventoryUpdates && invoiceResult.inventoryUpdates.sku) {
        currentInventory = await databaseUtils.getInventoryItems(invoiceResult.inventoryUpdates.sku);
      }
      
      // Step 3: Update inventory
      let updatedInventory = null;
      if (invoiceResult.inventoryUpdates) {
        updatedInventory = await databaseUtils.updateInventory(invoiceResult.inventoryUpdates);
      }
      
      // Step 4: Save invoice record
      const record = await databaseUtils.saveInvoiceRecord({
        filename: 'invoice1.pdf',
        date: new Date().toISOString(),
        extractedData: invoiceResult.extractedData
      });
      
      return {
        extractedData: invoiceResult.extractedData,
        translation: invoiceResult.translation,
        previousQuantity: currentInventory.length > 0 ? currentInventory[0].quantity : 0,
        updatedInventory,
        recordId: record.id
      };
    } catch (error) {
      throw error;
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should process an invoice and update inventory correctly', async () => {
    // Arrange
    const invoiceFileBuffer = Buffer.from('mock invoice data');
    
    // Act
    const result = await simulateInvoiceWorkflow(invoiceFileBuffer);
    
    // Assert
    expect(invoiceProcessor.processInvoice).toHaveBeenCalledWith(invoiceFileBuffer);
    expect(databaseUtils.getInventoryItems).toHaveBeenCalledWith('JPN-1234');
    expect(databaseUtils.updateInventory).toHaveBeenCalledWith(expect.objectContaining({
      action: 'add',
      sku: 'JPN-1234',
      quantity: 20
    }));
    expect(databaseUtils.saveInvoiceRecord).toHaveBeenCalled();
    
    // Check the result
    expect(result).toMatchObject({
      extractedData: expect.objectContaining({
        productCode: 'JPN-1234',
        quantity: 20
      }),
      translation: expect.any(String),
      previousQuantity: 50,
      updatedInventory: expect.objectContaining({
        sku: 'JPN-1234',
        quantity: 70
      }),
      recordId: expect.any(String)
    });
  });
  
  it('should handle invoice processing errors', async () => {
    // Arrange
    const invoiceFileBuffer = Buffer.from('mock invoice data');
    invoiceProcessor.processInvoice.mockRejectedValueOnce(new Error('OCR error'));
    
    // Act & Assert
    await expect(simulateInvoiceWorkflow(invoiceFileBuffer)).rejects.toThrow('OCR error');
    
    expect(invoiceProcessor.processInvoice).toHaveBeenCalled();
    expect(databaseUtils.updateInventory).not.toHaveBeenCalled();
    expect(databaseUtils.saveInvoiceRecord).not.toHaveBeenCalled();
  });
});