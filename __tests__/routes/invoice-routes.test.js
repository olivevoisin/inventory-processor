const request = require('supertest');
const app = require('../../app');
const invoiceService = require('../../modules/invoice-service');

// Mock invoice service
jest.mock('../../modules/invoice-service');

describe('Invoice Routes', () => {
  beforeEach(() => {
    // Set environment variables for testing
    process.env.SKIP_AUTH = 'true';
    process.env.TEST_VALIDATION = 'true'; // Enable validation in tests
    
    jest.clearAllMocks();

    // Mock invoice service functions
    invoiceService.processSingleInvoice.mockResolvedValue({
      invoiceId: 'INV-123',
      items: [{ product: 'Test Product', quantity: 5 }]
    });

    invoiceService.processInvoices.mockResolvedValue({
      success: true,
      processed: 2,
      errors: 0
    });
  });

  afterEach(() => {
    // Reset environment variables
    delete process.env.SKIP_AUTH;
    delete process.env.TEST_VALIDATION;
  });

  describe('POST /api/invoices/process', () => {
    const formData = {
      location: 'Bar'
    };
    // Create a mock PDF buffer
    const mockPdfBuffer = Buffer.from('Mock PDF content');

    it('should process invoice file and return results', async () => {
      await request(app)
        .post('/api/invoices/process')
        .set('x-api-key', 'test-api-key')
        .set('x-skip-auth', 'true')
        .attach('file', mockPdfBuffer, 'test-invoice.pdf')
        .field('location', formData.location)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.result).toBeDefined();
        });
      
      expect(invoiceService.processSingleInvoice).toHaveBeenCalled();
    });

    it('should return 400 when no file is provided', async () => {
      await request(app)
        .post('/api/invoices/process')
        .set('x-api-key', 'test-api-key')
        .set('x-skip-auth', 'true')
        .field('location', formData.location)
        .expect(400);
    });

    it('should return 400 when no location is provided', async () => {
      await request(app)
        .post('/api/invoices/process')
        .set('x-api-key', 'test-api-key')
        .set('x-skip-auth', 'true')
        .attach('file', mockPdfBuffer, 'test-invoice.pdf')
        .expect(400);
    });
  });

  describe('POST /api/invoices/process-batch', () => {
    it('should process a batch of invoices and return results', async () => {
      const requestBody = {
        sourceDir: '/path/to/invoices',
        processedDir: '/path/to/processed'
      };
      await request(app)
        .post('/api/invoices/process-batch')
        .set('x-api-key', 'test-api-key')
        .set('x-skip-auth', 'true')
        .send(requestBody)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.result).toBeDefined();
        });
      
      expect(invoiceService.processInvoices).toHaveBeenCalledWith(
        requestBody.sourceDir,
        requestBody.processedDir
      );
    });

    it('should return 400 when required parameters are missing', async () => {
      await request(app)
        .post('/api/invoices/process-batch')
        .set('x-api-key', 'test-api-key')
        .set('x-skip-auth', 'true')
        .send({})
        .expect(400);
    });

    test('POST /api/invoices/process-batch should process a batch of invoices and return results', async () => {
      const requestBody = {
        files: [
          { buffer: Buffer.from('mock invoice content'), originalname: 'invoice1.pdf' },
          { buffer: Buffer.from('mock invoice content'), originalname: 'invoice2.pdf' }
        ],
        location: 'bar'
      };

      await request(app)
        .post('/api/invoices/process-batch')
        .set('x-skip-auth', 'true')
        .send(requestBody)
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(res.body.result).toBeDefined();
        });
    });

    test('POST /api/invoices/process-batch should process a batch of invoices', async () => {
      const requestBody = {
        files: [{ buffer: Buffer.from('mock invoice content') }],
        location: 'bar'
      };

      await request(app)
        .post('/api/invoices/process-batch')
        .set('x-api-key', 'test-api-key')
        .send(requestBody)
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.result)).toBe(true);
        });
    });

    test('POST /api/invoices/process-batch should return error if no location is provided', async () => {
      const requestBody = {
        files: [{ buffer: Buffer.from('mock invoice content') }]
      };

      await request(app)
        .post('/api/invoices/process-batch')
        .set('x-api-key', 'test-api-key')
        .send(requestBody)
        .expect(400)
        .expect(res => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Location is required');
        });
    });
  });

  describe('GET /api/invoices/:id', () => {
    test('should return 404 when invoice is not found', async () => {
      // Assuming the app defines this GET route and uses databaseUtils.getInvoiceById
      const response = await request(app)
        .get('/api/invoices/UNKNOWN')
        .set('x-api-key', 'test-api-key')
        .set('x-skip-auth', 'true');
        
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
