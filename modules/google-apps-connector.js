/**
 * Google Apps Script Connector for the Inventory Management System
 * This module handles communication with the Google Apps Script backend
 */

const axios = require('axios');
const { createLogger } = require('../utils/logger');

const logger = createLogger('google-apps-connector');

// Default configuration
const DEFAULT_CONFIG = {
  apiEndpoint: '',
  apiKey: '',
  spreadsheetId: '',
  timeout: 30000 // 30 seconds
};

class GoogleAppsConnector {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isConfigured = Boolean(this.config.apiEndpoint && this.config.apiKey);
    
    if (!this.isConfigured) {
      logger.warn('GoogleAppsConnector initialized without proper configuration');
    } else {
      logger.info('GoogleAppsConnector initialized successfully');
    }
  }
  
  /**
   * Configure the connector
   * @param {Object} config - Configuration options
   * @returns {boolean} - True if configured successfully
   */
  configure(config = {}) {
    this.config = { ...this.config, ...config };
    this.isConfigured = Boolean(this.config.apiEndpoint && this.config.apiKey);
    
    if (!this.isConfigured) {
      logger.warn('GoogleAppsConnector configuration incomplete');
    } else {
      logger.info('GoogleAppsConnector configured successfully');
    }
    
    return this.isConfigured;
  }
  
  /**
   * Validate if the connector is properly configured
   * @returns {boolean} - True if configured properly
   */
  validateConfig() {
    if (!this.isConfigured) {
      logger.error('GoogleAppsConnector not properly configured');
      return false;
    }
    return true;
  }
  
  /**
   * Sync inventory data to Google Sheet
   * @param {Array} inventoryData - Inventory data to sync
   * @returns {Promise<Object>} - Sync result
   */
  async syncInventory(inventoryData) {
    try {
      if (!this.validateConfig()) {
        throw new Error('Connector not properly configured');
      }
      
      logger.info(`Syncing ${inventoryData.length} inventory items to Google Sheet`);
      
      const response = await axios.post(
        this.config.apiEndpoint,
        {
          action: 'syncInventory',
          spreadsheetId: this.config.spreadsheetId,
          data: inventoryData
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );
      
      if (response.data.success) {
        logger.info('Inventory sync successful');
        return {
          success: true,
          message: 'Inventory synced successfully',
          data: response.data.data || {}
        };
      } else {
        logger.error(`Inventory sync failed: ${response.data.message}`);
        return {
          success: false,
          message: response.data.message || 'Unknown error during sync',
          error: response.data.error || 'SYNC_FAILED'
        };
      }
    } catch (error) {
      logger.error(`Error syncing inventory: ${error.message}`);
      
      return {
        success: false,
        message: `Error syncing inventory: ${error.message}`,
        error: error.name || 'SYNC_ERROR'
      };
    }
  }
  
  /**
   * Fetch inventory data from Google Sheet
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} - Fetch result
   */
  async fetchInventory(options = {}) {
    try {
      if (!this.validateConfig()) {
        throw new Error('Connector not properly configured');
      }
      
      logger.info('Fetching inventory data from Google Sheet');
      
      const response = await axios.post(
        this.config.apiEndpoint,
        {
          action: 'fetchInventory',
          spreadsheetId: this.config.spreadsheetId,
          options
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );
      
      if (response.data.success) {
        logger.info(`Fetched ${response.data.data?.length || 0} inventory items`);
        return {
          success: true,
          message: 'Inventory fetched successfully',
          data: response.data.data || []
        };
      } else {
        logger.error(`Inventory fetch failed: ${response.data.message}`);
        return {
          success: false,
          message: response.data.message || 'Unknown error during fetch',
          error: response.data.error || 'FETCH_FAILED'
        };
      }
    } catch (error) {
      logger.error(`Error fetching inventory: ${error.message}`);
      
      return {
        success: false,
        message: `Error fetching inventory: ${error.message}`,
        error: error.name || 'FETCH_ERROR'
      };
    }
  }
  
  /**
   * Execute a custom Google Apps Script function
   * @param {string} functionName - Name of the function to execute
   * @param {Object} params - Parameters for the function
   * @returns {Promise<Object>} - Execution result
   */
  async executeFunction(functionName, params = {}) {
    try {
      if (!this.validateConfig()) {
        throw new Error('Connector not properly configured');
      }
      
      if (!functionName) {
        throw new Error('Function name is required');
      }
      
      logger.info(`Executing Google Apps Script function: ${functionName}`);
      
      const response = await axios.post(
        this.config.apiEndpoint,
        {
          action: 'executeFunction',
          function: functionName,
          params
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );
      
      if (response.data.success) {
        logger.info(`Function ${functionName} executed successfully`);
        return {
          success: true,
          message: `Function ${functionName} executed successfully`,
          data: response.data.data
        };
      } else {
        logger.error(`Function ${functionName} execution failed: ${response.data.message}`);
        return {
          success: false,
          message: response.data.message || `Function ${functionName} execution failed`,
          error: response.data.error || 'EXECUTION_FAILED'
        };
      }
    } catch (error) {
      logger.error(`Error executing function ${functionName}: ${error.message}`);
      
      return {
        success: false,
        message: `Error executing function ${functionName}: ${error.message}`,
        error: error.name || 'EXECUTION_ERROR'
      };
    }
  }
}

// Export a singleton instance
const connector = new GoogleAppsConnector();

module.exports = {
  GoogleAppsConnector,
  connector
};
