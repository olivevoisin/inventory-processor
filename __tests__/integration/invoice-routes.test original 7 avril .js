const request = require('supertest');
const app = require('../../app');
const invoiceService = require('../../modules/invoice-service');
// Mock invoice service
jest.mock('../../modules/invoice-service');
describe('Invoice Routes', () => {
beforeEach(() => {
// Set environment variable to skip auth for tests
process.env.SKIP_AUTH = 'true';
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
// Reset environment variable
delete process.env.SKIP_AUTH;
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
});
});
