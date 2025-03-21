/**
 * Google Sheets Service
 * Handles interactions with Google Sheets API for inventory management
 */
const { google } = require('googleapis');
const logger = require('../utils/logger');
const { ExternalServiceError } = require('../utils/error-handler');
const config = require('../config');

class GoogleSheetsService {
  constructor() {
    this.sheetsApiReady = false;
    this.auth = null;
    this.sheets = null;
    this.initialized = false;
  }

  /**
   * Initialize the Google Sheets API client
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // In a real implementation, this would use credentials from config
      // For tests, we'll mock this
      this.auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await this.auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: client });
      this.sheetsApiReady = true;
      this.initialized = true;
      
      logger.info('Google Sheets API initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to initialize Google Sheets API: ${error.message}`);
      this.sheetsApiReady = false;
      throw new ExternalServiceError('Google Sheets', error.message, error);
    }
  }

  /**
   * Check if the API is ready for use
   * @returns {boolean} Ready status
   */
  isReady() {
    return this.sheetsApiReady;
  }

  /**
   * Create a new spreadsheet
   * @param {string} title - Title for the new spreadsheet
   * @returns {Promise<Object>} - Created spreadsheet info
   */
  async createSpreadsheet(title) {
    if (!this.isReady()) {
      if (!this.initialized) {
        await this.initialize();
      } else {
        throw new ExternalServiceError('Google Sheets', 'API not ready');
      }
    }

    try {
      const response = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title
          },
          sheets: [
            {
              properties: {
                title: 'Inventory',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 20
                }
              }
            }
          ]
        }
      });

      logger.info(`Created spreadsheet: ${title} with ID: ${response.data.spreadsheetId}`);
      return {
        id: response.data.spreadsheetId,
        title: response.data.properties.title,
        url: `https://docs.google.com/spreadsheets/d/${response.data.spreadsheetId}`
      };
    } catch (error) {
      logger.error(`Error creating spreadsheet: ${error.message}`);
      throw new ExternalServiceError('Google Sheets', `Failed to create spreadsheet: ${error.message}`, error);
    }
  }

  /**
   * Read values from a spreadsheet
   * @param {string} spreadsheetId - ID of the spreadsheet
   * @param {string} range - Range to read (e.g., 'Sheet1!A1:C10')
   * @returns {Promise<Array>} - Values from the spreadsheet
   */
  async readValues(spreadsheetId, range) {
    if (!this.isReady()) {
      if (!this.initialized) {
        await this.initialize();
      } else {
        throw new ExternalServiceError('Google Sheets', 'API not ready');
      }
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      return response.data.values || [];
    } catch (error) {
      logger.error(`Error reading spreadsheet values: ${error.message}`);
      throw new ExternalServiceError('Google Sheets', `Failed to read values: ${error.message}`, error);
    }
  }

  /**
   * Append values to a spreadsheet
   * @param {string} spreadsheetId - ID of the spreadsheet
   * @param {string} range - Range to append to (e.g., 'Sheet1!A1')
   * @param {Array} values - 2D array of values to append
   * @returns {Promise<Object>} - Update result
   */
  async appendValues(spreadsheetId, range, values) {
    if (!this.isReady()) {
      if (!this.initialized) {
        await this.initialize();
      } else {
        throw new ExternalServiceError('Google Sheets', 'API not ready');
      }
    }

    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values
        }
      });

      logger.info(`Appended values to spreadsheet: ${spreadsheetId}, range: ${response.data.updates.updatedRange}`);
      return {
        updatedRange: response.data.updates.updatedRange,
        updatedRows: response.data.updates.updatedRows,
        updatedColumns: response.data.updates.updatedColumns,
        updatedCells: response.data.updates.updatedCells
      };
    } catch (error) {
      logger.error(`Error appending values to spreadsheet: ${error.message}`);
      throw new ExternalServiceError('Google Sheets', `Failed to append values: ${error.message}`, error);
    }
  }

  /**
   * Update values in a spreadsheet
   * @param {string} spreadsheetId - ID of the spreadsheet
   * @param {string} range - Range to update (e.g., 'Sheet1!A1:C10')
   * @param {Array} values - 2D array of values to update
   * @returns {Promise<Object>} - Update result
   */
  async updateValues(spreadsheetId, range, values) {
    if (!this.isReady()) {
      if (!this.initialized) {
        await this.initialize();
      } else {
        throw new ExternalServiceError('Google Sheets', 'API not ready');
      }
    }

    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values
        }
      });

      logger.info(`Updated values in spreadsheet: ${spreadsheetId}, range: ${response.data.updatedRange}`);
      return {
        updatedRange: response.data.updatedRange,
        updatedRows: response.data.updatedRows,
        updatedColumns: response.data.updatedColumns,
        updatedCells: response.data.updatedCells
      };
    } catch (error) {
      logger.error(`Error updating values in spreadsheet: ${error.message}`);
      throw new ExternalServiceError('Google Sheets', `Failed to update values: ${error.message}`, error);
    }
  }

  /**
   * Export inventory data to a spreadsheet
   * @param {Array} items - Inventory items to export
   * @param {string} spreadsheetId - Optional existing spreadsheet ID
   * @returns {Promise<Object>} - Export result
   */
  async exportInventory(items, spreadsheetId = null) {
    try {
      // Create a new spreadsheet if ID not provided
      if (!spreadsheetId) {
        const newSheet = await this.createSpreadsheet(`Inventory Export ${new Date().toISOString().split('T')[0]}`);
        spreadsheetId = newSheet.id;
      }

      // Prepare data for export
      const headers = [
        'ID', 'Product Name', 'Quantity', 'Unit', 'Location', 'Last Updated'
      ];

      const rows = items.map(item => [
        item.id,
        item.product_name,
        item.quantity.toString(),
        item.unit,
        item.location || '',
        item.timestamp
      ]);

      // Add headers as first row
      const values = [headers, ...rows];

      // Write to spreadsheet
      await this.updateValues(spreadsheetId, 'Sheet1!A1', values);

      return {
        success: true,
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        exportedItems: items.length
      };
    } catch (error) {
      logger.error(`Error exporting inventory: ${error.message}`);
      throw new ExternalServiceError('Google Sheets', `Failed to export inventory: ${error.message}`, error);
    }
  }
}

// Create and export a singleton instance
const googleSheetsService = new GoogleSheetsService();
module.exports = googleSheetsService;
