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
