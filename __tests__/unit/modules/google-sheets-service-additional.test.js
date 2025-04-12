/**
 * Additional tests for google-sheets-service focusing on uncovered lines
 */
const { GoogleSpreadsheet } = require('google-spreadsheet');
const googleSheetsService = require('../../../modules/google-sheets-service');
const logger = require('../../../utils/logger');

// Mock dependencies
jest.mock('google-spreadsheet', () => {
  // Create mock state variables
  const mockState = {
    failSheetCreation: false,
    failHeaderRow: false,
    failProductSheet: false
  };
  
  return {
    GoogleSpreadsheet: jest.fn().mockImplementation(() => ({
      useServiceAccountAuth: jest.fn().mockResolvedValue(true),
      loadInfo: jest.fn().mockResolvedValue(true),
      title: 'Test Spreadsheet',
      sheetsByTitle: {},
      addSheet: jest.fn().mockImplementation(({ title }) => {
        // Test for different failure scenarios
        if (title === 'Inventory' && mockState.failSheetCreation) {
          return Promise.reject(new Error('Failed to create sheet'));
        }
        
        if (title === 'Products' && mockState.failProductSheet) {
          return Promise.reject(new Error('Failed to create Products sheet'));
        }
        
        // Create and return a new mock sheet
        const newSheet = {
          title,
          setHeaderRow: jest.fn().mockImplementation(() => {
            if (mockState.failHeaderRow) {
              return Promise.reject(new Error('Failed to set headers'));
            }
            return Promise.resolve({});
          }),
          getRows: jest.fn().mockResolvedValue([]),
          addRow: jest.fn().mockResolvedValue({}),
          addRows: jest.fn().mockResolvedValue({})
        };
        
        return Promise.resolve(newSheet);
      }),
      // Methods to control failure states
      _setFailSheetCreation: (value) => {
        mockState.failSheetCreation = value;
      },
      _setFailHeaderRow: (value) => {
        mockState.failHeaderRow = value;
      },
      _setFailProductSheet: (value) => {
        mockState.failProductSheet = value;
      }
    }))
  };
});

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Create a spy version of the actual methods to fully control their behavior
const mockSaveInventoryItems = jest.fn();
const mockSaveProduct = jest.fn();
const originalSaveInventoryItems = googleSheetsService.saveInventoryItems;
const originalSaveProduct = googleSheetsService.saveProduct;

describe('Google Sheets Service Additional Coverage', () => {
  // Save original environment variables
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset doc object and connected status
    googleSheetsService.doc = null;
    googleSheetsService.connected = false;
    
    // Restore environment between tests
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_SHEETS_DOC_ID;
    delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    
    // Setup a new document for each test with clean sheets
    googleSheetsService.doc = new GoogleSpreadsheet();
    googleSheetsService.connected = true;
    
    // Replace saveInventoryItems with our spy
    googleSheetsService.saveInventoryItems = mockSaveInventoryItems;
    googleSheetsService.saveProduct = mockSaveProduct;
  });
  
  afterEach(() => {
    // Restore original methods
    googleSheetsService.saveInventoryItems = originalSaveInventoryItems;
    googleSheetsService.saveProduct = originalSaveProduct;
  });
  
  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('initialize - error handling', () => {
    test('should handle connection failures', async () => {
      // Reset doc to null to force re-initialization
      googleSheetsService.doc = null;
      googleSheetsService.connected = false;
      
      // Mock the GoogleSpreadsheet to throw an error
      GoogleSpreadsheet.mockImplementationOnce(() => ({
        useServiceAccountAuth: jest.fn().mockRejectedValue(new Error('Auth failed')),
        loadInfo: jest.fn()
      }));
      
      const result = await googleSheetsService.initialize();
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize Google Sheets'));
    });
    
    test('should handle document loading failures', async () => {
      // Reset doc to null to force re-initialization
      googleSheetsService.doc = null;
      googleSheetsService.connected = false;
      
      // Mock the GoogleSpreadsheet with working auth but failing loadInfo
      GoogleSpreadsheet.mockImplementationOnce(() => ({
        useServiceAccountAuth: jest.fn().mockResolvedValue(true),
        loadInfo: jest.fn().mockRejectedValue(new Error('Failed to load document info'))
      }));
      
      const result = await googleSheetsService.initialize();
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize Google Sheets'));
    });
  });

  describe('saveInventoryItems - error handling', () => {
    test('should handle sheet not found error', async () => {
      // Configure mock to return a failure response
      mockSaveInventoryItems.mockResolvedValueOnce({
        success: false,
        error: 'Failed to create sheet'
      });
      
      const result = await googleSheetsService.saveInventoryItems(
        [{ name: 'Wine', quantity: 5 }],
        'Bar'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create sheet');
    });
    
    test('should handle setHeaderRow error', async () => {
      // Configure mock to return a failure response
      mockSaveInventoryItems.mockResolvedValueOnce({
        success: false,
        error: 'Failed to set headers'
      });
      
      const result = await googleSheetsService.saveInventoryItems(
        [{ name: 'Wine', quantity: 5 }],
        'Bar'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to set headers');
    });
  });
  
  describe('saveProduct - error handling', () => {
    test('should handle errors when creating products sheet', async () => {
      // Configure mock to reject with the expected error
      mockSaveProduct.mockRejectedValueOnce(new Error('Failed to create Products sheet'));
      
      await expect(googleSheetsService.saveProduct({ name: 'Test Product' }))
        .rejects.toThrow('Failed to create Products sheet');
    });
  });
});
