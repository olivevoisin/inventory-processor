<<<<<<< HEAD
const request = require('supertest');
const app = require('../../app');
const invoiceService = require('../../modules/invoice-service');

// Mock du service des factures
jest.mock('../../modules/invoice-service', () => ({
  processSingleInvoice: jest.fn().mockResolvedValue({
    items: [
      { product: 'Vodka Grey Goose', count: 5, price: '14,995' },
      { product: 'Wine Cabernet', count: 10, price: '15,990' }
    ],
    invoiceDate: '2023-01-15',
    total: '30,985'
  }),
  processInvoices: jest.fn().mockResolvedValue({
    success: true,
    processed: 2,
    errors: 0
  })
}));

describe('Invoice Routes', () => {
  // Test de la route POST /api/invoices/process
  describe('POST /api/invoices/process', () => {
    it('should process invoice file and return results', async () => {
      // Arrange
      const formData = {
        location: 'boisson_maison'
      };
      
      // Créer un petit tampon de fichier PDF fictif
      const mockPdfBuffer = Buffer.from('fake pdf data');
      
      // Act & Assert
      await request(app)
        .post('/api/invoices/process')
        .attach('file', mockPdfBuffer, 'test-invoice.pdf')
        .field('location', formData.location)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.result).toBeDefined();
          expect(res.body.result.items).toBeInstanceOf(Array);
          expect(res.body.result.items.length).toBe(2);
        });
      
      // Verify
      expect(invoiceService.processSingleInvoice).toHaveBeenCalledTimes(1);
    });
    
    it('should return 400 when no file is provided', async () => {
      // Arrange
      const formData = {
        location: 'boisson_maison'
      };
      
      // Act & Assert
      await request(app)
        .post('/api/invoices/process')
        .field('location', formData.location)
        .expect(400);
    });
    
    it('should return 400 when no location is provided', async () => {
      // Arrange
      const mockPdfBuffer = Buffer.from('fake pdf data');
      
      // Act & Assert
      await request(app)
        .post('/api/invoices/process')
        .attach('file', mockPdfBuffer, 'test-invoice.pdf')
        .expect(400);
    });
  });
  
  // Test de la route POST /api/invoices/process-batch
  describe('POST /api/invoices/process-batch', () => {
    it('should process a batch of invoices and return results', async () => {
      // Arrange
      const requestBody = {
        sourceDir: './data/invoices',
        processedDir: './data/processed'
      };
      
      // Act & Assert
      await request(app)
        .post('/api/invoices/process-batch')
        .send(requestBody)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.result).toBeDefined();
          expect(res.body.result.success).toBe(true);
          expect(res.body.result.processed).toBe(2);
          expect(res.body.result.errors).toBe(0);
        });
      
      // Verify
      expect(invoiceService.processInvoices).toHaveBeenCalledWith(
        requestBody.sourceDir,
        requestBody.processedDir
      );
    });
    
    it('should return 400 when required parameters are missing', async () => {
      // Act & Assert
      await request(app)
        .post('/api/invoices/process-batch')
        .send({})
        .expect(400);
    });
  });
});
=======
/**
 * Unit tests for invoice routes
 */
const { handlers } = require('../../../routes/invoice-routes');
const invoiceService = require('../../../modules/invoice-service');
const invoiceProcessor = require('../../../modules/invoice-processor');
const databaseUtils = require('../../../utils/database-utils');
const logger = require('../../../utils/logger');

// Mock dependencies
jest.mock('../../../modules/invoice-service', () => ({
  processSingleInvoice: jest.fn(),
  processInvoices: jest.fn()
}));

jest.mock('../../../modules/invoice-processor', () => ({
  getProcessingHistory: jest.fn()
}));

jest.mock('../../../utils/database-utils', () => ({
  getInvoiceById: jest.fn()
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Invoice Routes', () => {
  // Common test objects
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock request and response objects
    req = {
      body: {},
      params: {},
      file: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('POST /api/invoices/process', () => {
    it('should process invoice file and return results', async () => {
      // Setup mocks
      req.file = {
        path: '/tmp/invoice.pdf',
        originalname: 'invoice.pdf'
      };
      req.body.location = 'WAREHOUSE';

      invoiceService.processSingleInvoice.mockResolvedValue({
        id: 'inv-123',
        status: 'completed'
      });

      // Execute handler
      await handlers.processSingleInvoice(req, res);

      // Assert
      expect(invoiceService.processSingleInvoice).toHaveBeenCalledWith(
        '/tmp/invoice.pdf',
        'WAREHOUSE'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        result: expect.objectContaining({
          id: 'inv-123'
        })
      });
    });

    it('should return 400 when no file is provided', async () => {
      // Setup mocks - no file
      req.body.location = 'WAREHOUSE';

      // Execute handler
      await handlers.processSingleInvoice(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No file provided'
      });
    });

    it('should return 400 when no location is provided', async () => {
      // Setup mocks - file but no location
      req.file = {
        path: '/tmp/invoice.pdf',
        originalname: 'invoice.pdf'
      };

      // Execute handler
      await handlers.processSingleInvoice(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Location is required'
      });
    });

    it('should return 500 when processing fails', async () => {
      // Setup mocks
      req.file = {
        path: '/tmp/invoice.pdf',
        originalname: 'invoice.pdf'
      };
      req.body.location = 'WAREHOUSE';

      invoiceService.processSingleInvoice.mockRejectedValue(
        new Error('Processing error')
      );

      // Execute handler
      await handlers.processSingleInvoice(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to process invoice',
        details: 'Processing error'
      });
    });
  });

  describe('POST /api/invoices/process-batch', () => {
    it('should process a batch of invoices and return results', async () => {
      // Setup mocks
      req.body = {
        sourceDir: '/tmp/invoices',
        processedDir: '/tmp/processed'
      };

      invoiceService.processInvoices.mockResolvedValue({
        processed: 3,
        failed: 0,
        details: []
      });

      // Execute handler
      await handlers.processBatchInvoices(req, res);

      // Assert
      expect(invoiceService.processInvoices).toHaveBeenCalledWith(
        '/tmp/invoices',
        '/tmp/processed'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        result: expect.objectContaining({
          processed: 3
        })
      });
    });

    it('should return 500 when batch processing fails', async () => {
      // Setup mocks
      req.body = {
        sourceDir: '/tmp/invoices',
        processedDir: '/tmp/processed'
      };

      invoiceService.processInvoices.mockRejectedValue(
        new Error('Batch processing error')
      );

      // Execute handler
      await handlers.processBatchInvoices(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to process invoice batch',
        details: 'Batch processing error'
      });
    });
  });

  describe('GET /api/invoices/history', () => {
    it('should return invoice processing history', async () => {
      // Setup mocks
      invoiceProcessor.getProcessingHistory.mockResolvedValue([
        { id: 'inv-123', date: '2023-10-15', status: 'completed' },
        { id: 'inv-124', date: '2023-10-14', status: 'completed' }
      ]);

      // Execute handler
      await handlers.getInvoiceHistory(req, res);

      // Assert
      expect(invoiceProcessor.getProcessingHistory).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        history: expect.arrayContaining([
          expect.objectContaining({ id: 'inv-123' }),
          expect.objectContaining({ id: 'inv-124' })
        ])
      });
    });

    it('should return 500 when history retrieval fails', async () => {
      // Setup mocks
      invoiceProcessor.getProcessingHistory.mockRejectedValue(
        new Error('Database error')
      );

      // Execute handler
      await handlers.getInvoiceHistory(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve invoice history',
        details: 'Database error'
      });
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('should return invoice by ID when found', async () => {
      // Setup mocks
      req.params.id = 'inv-123';
      databaseUtils.getInvoiceById.mockResolvedValue({
        id: 'inv-123',
        date: '2023-10-15',
        products: [{ code: 'JPN-1234', quantity: 20, price: 2500 }],
        totalAmount: 50000
      });

      // Execute handler
      await handlers.getInvoiceById(req, res);

      // Assert
      expect(databaseUtils.getInvoiceById).toHaveBeenCalledWith('inv-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        invoice: expect.objectContaining({
          id: 'inv-123'
        })
      });
    });

    it('should return 404 when invoice is not found', async () => {
      // Setup mocks
      req.params.id = 'non-existent';
      databaseUtils.getInvoiceById.mockResolvedValue(null);

      // Execute handler
      await handlers.getInvoiceById(req, res);

      // Assert
      expect(databaseUtils.getInvoiceById).toHaveBeenCalledWith('non-existent');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invoice not found'
      });
    });

    it('should return 500 when database lookup fails', async () => {
      // Setup mocks
      req.params.id = 'inv-123';
      databaseUtils.getInvoiceById.mockRejectedValue(
        new Error('Database error')
      );

      // Execute handler
      await handlers.getInvoiceById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });
});
>>>>>>> backup-main
