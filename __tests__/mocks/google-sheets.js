// Mock pour le service Google Sheets
const sheetsApiMock = {
  spreadsheets: {
    values: {
      get: jest.fn().mockResolvedValue({
        data: {
          values: [
            ['ID', 'Produit', 'Unité', 'Prix'],
            ['1', 'Vin Rouge', 'bouteille', '15.99'],
            ['2', 'Bière Blonde', 'cannette', '2.50'],
            ['3', 'Vodka Grey Goose', 'bouteille', '45.00']
          ]
        }
      }),
      append: jest.fn().mockResolvedValue({
        data: {
          updates: {
            updatedRange: 'Inventaire!A1:D10',
            updatedRows: 5,
            updatedColumns: 4,
            updatedCells: 20
          }
        }
      }),
      update: jest.fn().mockResolvedValue({
        data: {
          updatedRange: 'Inventaire!A1:D10',
          updatedRows: 5,
          updatedColumns: 4,
          updatedCells: 20
        }
      })
    }
  }
};

const googleSheetsMock = {
  loadInfo: jest.fn().mockResolvedValue(undefined),
  useServiceAccountAuth: jest.fn().mockResolvedValue(undefined),
  sheetsByTitle: {
    'Inventaire': {
      getRows: jest.fn().mockResolvedValue([
        {
          id: '1',
          produit: 'Vin Rouge',
          quantite: '10',
          unite: 'bouteille',
          prix: '15.99',
          save: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined)
        }
      ]),
      addRow: jest.fn().mockResolvedValue(undefined)
    }
  }
};

module.exports = {
  GoogleSpreadsheet: jest.fn().mockImplementation(() => googleSheetsMock),
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({})
      }))
    },
    sheets: jest.fn().mockReturnValue(sheetsApiMock)
  }
};
