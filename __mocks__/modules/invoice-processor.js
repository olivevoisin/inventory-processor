/**
 * Mock for the invoice processor module
 */
module.exports = {
  processInvoice: jest.fn().mockResolvedValue({
    invoiceId: 'INV-MOCK',
    invoiceDate: '2023-01-15',
    supplier: 'Test Supplier',
    location: 'Bar',
    total: 309.85,
    items: [
      { product: 'Vodka Grey Goose', count: 5, price: '14,995' },
      { product: 'Wine Cabernet', count: 10, price: '15,990' }
    ]
  }),
  
  processIncomingInvoices: jest.fn().mockResolvedValue({
    processed: 3,
    errors: 0,
    items: [
      { product: 'Vodka Grey Goose', count: 15, price: '44,985' },
      { product: 'Wine Cabernet', count: 30, price: '47,970' }
    ]
  }),
  
  convertToInventoryFormat: jest.fn().mockImplementation((invoiceData) => {
    const items = (invoiceData.items || []).map(item => ({
      product_name: item.product,
      quantity: item.count || item.quantity,
      unit: item.unit || 'bottle',
      price: parseFloat((item.price || '0').replace(',', '.')),
      source: 'invoice'
    }));
    
    return {
      invoiceId: invoiceData.invoiceId,
      date: invoiceData.date || invoiceData.invoiceDate,
      supplier: invoiceData.supplier,
      items
    };
  }),
  
  initialize: jest.fn().mockResolvedValue(),
  terminate: jest.fn().mockResolvedValue()
};
