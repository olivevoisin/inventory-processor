// __tests__/mocks/deepgram-mock.js
/**
 * Mock implementation of the Deepgram speech-to-text API
 */
const nock = require('nock');

function setupDeepgramMock(options = {}) {
  const {
    apiKey = 'test_deepgram_key',
    statusCode = 200,
    responseData = null,
    errorMessage = null
  } = options;
  
  // Default successful response
  const defaultResponse = {
    results: {
      channels: [{ 
        alternatives: [{ 
          transcript: options.transcript || 'add 5 units of product SKU12345 to inventory location A3',
          confidence: 0.92
        }] 
      }]
    }
  };
  
  const mockResponse = responseData || defaultResponse;
  
  // Set up the nock interceptor
  const scope = nock('https://api.deepgram.com', {
    reqheaders: {
      'Authorization': `Token ${apiKey}`
    }
  });
  
  if (errorMessage) {
    return scope.post('/v1/listen').replyWithError(errorMessage);
  } else {
    return scope.post('/v1/listen').reply(statusCode, mockResponse);
  }
}

module.exports = { setupDeepgramMock };

// __tests__/mocks/google-sheets-mock.js
/**
 * Mock implementation of the Google Sheets API
 */
const sinon = require('sinon');

class MockGoogleSpreadsheet {
  constructor(sheetId) {
    this.sheetId = sheetId;
    this.loadInfo = sinon.stub().resolves();
    this.sheetsByTitle = {};
    this.sheetsByIndex = [];
    this.addSheet = sinon.stub().callsFake(({ title, headerValues }) => {
      const newSheet = new MockSheet(title, headerValues);
      this.sheetsByTitle[title] = newSheet;
      this.sheetsByIndex.push(newSheet);
      return Promise.resolve(newSheet);
    });
  }
  
  setSheets(sheets) {
    sheets.forEach(sheet => {
      this.sheetsByTitle[sheet.title] = sheet;
      this.sheetsByIndex.push(sheet);
    });
  }
}

class MockSheet {
  constructor(title, headerValues = []) {
    this.title = title;
    this.headerValues = headerValues;
    this._rows = [];
    
    this.getRows = sinon.stub().callsFake(() => Promise.resolve([...this._rows]));
    this.addRow = sinon.stub().callsFake(rowData => {
      const newRow = { ...rowData, _sheet: this };
      newRow.save = sinon.stub().resolves();
      newRow.delete = sinon.stub().resolves();
      this._rows.push(newRow);
      return Promise.resolve(newRow);
    });
  }
  
  setRows(rows) {
    this._rows = rows.map(row => {
      const newRow = { ...row, _sheet: this };
      newRow.save = sinon.stub().resolves();
      newRow.delete = sinon.stub().resolves();
      return newRow;
    });
  }
}

function setupGoogleSheetsMock(options = {}) {
  const { 
    sheetId = 'test_sheet_id',
    sheets = [],
    inventoryItems = []
  } = options;
  
  const mockDoc = new MockGoogleSpreadsheet(sheetId);
  
  // Add default inventory sheet if not provided
  if (!sheets.some(sheet => sheet.title === 'Inventory')) {
    const inventorySheet = new MockSheet('Inventory', [
      'sku', 'quantity', 'location', 'lastUpdated', 'price'
    ]);
    inventorySheet.setRows(inventoryItems);
    sheets.push(inventorySheet);
  }
  
  mockDoc.setSheets(sheets);
  
  // Mock the GoogleSpreadsheet constructor
  sinon.stub(require('google-spreadsheet'), 'GoogleSpreadsheet')
    .returns(mockDoc);
    
  return mockDoc;
}

module.exports = { 
  MockGoogleSpreadsheet,
  MockSheet,
  setupGoogleSheetsMock
};

// __tests__/mocks/ocr-mock.js
/**
 * Mock implementation of the OCR service
 */
const nock = require('nock');

function setupOcrMock(options = {}) {
  const {
    apiUrl = 'https://api.ocr-service.com',
    endpoint = '/extract',
    statusCode = 200,
    responseData = null,
    errorMessage = null
  } = options;
  
  // Default successful response for a Japanese invoice
  const defaultResponse = {
    text: options.text || '請求書\n日付: 2023年10月15日\n商品番号: JPN-1234\n数量: 20\n単価: ¥2,500\n合計: ¥50,000',
    confidence: options.confidence || 0.95
  };
  
  const mockResponse = responseData || defaultResponse;
  
  // Set up the nock interceptor
  const scope = nock(apiUrl);
  
  if (errorMessage) {
    return scope.post(endpoint).replyWithError(errorMessage);
  } else {
    return scope.post(endpoint).reply(statusCode, mockResponse);
  }
}

module.exports = { setupOcrMock };

// __tests__/mocks/translation-mock.js
/**
 * Mock implementation of the translation service
 */
const nock = require('nock');

function setupTranslationMock(options = {}) {
  const {
    apiUrl = 'https://api.translation-service.com',
    endpoint = '/translate',
    statusCode = 200,
    responseData = null,
    errorMessage = null,
    sourceText = null,
    translatedText = null
  } = options;
  
  // Default successful response
  const defaultTranslation = translatedText || 
    'Facture\nDate: 15 Octobre 2023\nRéférence produit: JPN-1234\nQuantité: 20\nPrix unitaire: 2500 ¥\nMontant total: 50000 ¥';
  
  const defaultResponse = {
    translated_text: defaultTranslation,
    source_language: 'ja',
    target_language: 'fr',
    confidence: 0.92
  };
  
  const mockResponse = responseData || defaultResponse;
  
  // Set up the nock interceptor
  const scope = nock(apiUrl);
  
  if (errorMessage) {
    return scope.post(endpoint).replyWithError(errorMessage);
  } else {
    // Match only if the body contains the expected source text
    if (sourceText) {
      return scope
        .post(endpoint, (body) => body.text && body.text.includes(sourceText))
        .reply(statusCode, mockResponse);
    } else {
      return scope.post(endpoint).reply(statusCode, mockResponse);
    }
  }
}

module.exports = { setupTranslationMock };