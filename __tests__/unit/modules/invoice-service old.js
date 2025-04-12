// modules/invoice-service.js

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const invoiceProcessor = require('./invoice-processor');
const database = require('../utils/database-utils');
const notification = require('../utils/notification');
const { ValidationError } = require('../utils/error-handler');

class InvoiceService {
  constructor() {
    this.inputDir = config.invoiceProcessing.inputDir;
    this.archiveDir = config.invoiceProcessing.archiveDir;
    this.errorDir = config.invoiceProcessing.errorDir;
    this.enabled = config.invoiceProcessing.enabled;
    this.schedule = config.invoiceProcessing.schedule;
    this.allowedFileTypes = config.invoiceProcessing.allowedFileTypes;
    this.archiveProcessed = config.invoiceProcessing.archiveProcessed;
    
    // Create directories if they don't exist
    this.ensureDirectories();
    
    logger.info('Invoice service initialized', {
      module: 'invoice-service',
      enabled: this.enabled,
      schedule: this.schedule,
      inputDir: this.inputDir
    });
  }
  
  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [this.inputDir, this.archiveDir, this.errorDir];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`, {
          module: 'invoice-service'
        });
      }
    });
  }
  
  /**
   * Start the scheduled job
   */
  startScheduler() {
    if (!this.enabled) {
      logger.warn('Invoice processing scheduler is disabled', {
        module: 'invoice-service'
      });
      return;
    }
    
    if (!cron.validate(this.schedule)) {
      logger.error(`Invalid cron schedule: ${this.schedule}`, {
        module: 'invoice-service'
      });
      return;
    }
    
    logger.info(`Starting invoice processing scheduler with schedule: ${this.schedule}`, {
      module: 'invoice-service'
    });
    
    cron.schedule(this.schedule, async () => {
      const scheduledTime = new Date().toISOString();
      logger.info('Running scheduled invoice processing', {
        module: 'invoice-service',
        scheduledTime
      });
      
      await this.processAllInvoices();
    });
  }
  
  /**
   * Stop the scheduled job
   */
  stopScheduler() {
    // If using a more sophisticated scheduler, we would stop it here
    logger.info('Stopping invoice processing scheduler', {
      module: 'invoice-service'
    });
  }
  
  /**
   * Process all invoices in the input directory
   * @returns {Promise<Object>} Processing results
   */
  async processAllInvoices() {
    const requestId = `batch-${Date.now()}`;
    logger.info('Starting batch processing of invoices', {
      module: 'invoice-service',
      requestId,
      inputDir: this.inputDir
    });
    
    try {
      // Get all files in the input directory
      const files = fs.readdirSync(this.inputDir);
      const invoiceFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return this.allowedFileTypes.includes(ext);
      });
      
      if (invoiceFiles.length === 0) {
        logger.info('No invoice files found to process', {
          module: 'invoice-service',
          requestId
        });
        
        return {
          success: true,
          processed: 0,
          failed: 0,
          message: 'No invoice files found to process'
        };
      }
      
      logger.info(`Found ${invoiceFiles.length} invoice files to process`, {
        module: 'invoice-service',
        requestId,
        fileCount: invoiceFiles.length
      });
      
      // Process each file
      const results = {
        success: true,
        processed: 0,
        failed: 0,
        successfulFiles: [],
        failedFiles: []
      };
      
      for (const file of invoiceFiles) {
        const filePath = path.join(this.inputDir, file);
        
        try {
          logger.info(`Processing invoice file: ${file}`, {
            module: 'invoice-service',
            requestId,
            file
          });
          
          // Process invoice
          const invoiceResult = await invoiceProcessor.processInvoice(filePath, {
            translateToFrench: true,
            requestId: `${requestId}-${file}`
          });
          
          // Update inventory in database
          await this.updateInventory(invoiceResult, requestId);
          
          // Archive file if successful
          if (this.archiveProcessed) {
            await this.archiveFile(filePath, true);
          }
          
          results.processed++;
          results.successfulFiles.push(file);
          
          logger.info(`Successfully processed invoice: ${file}`, {
            module: 'invoice-service',
            requestId,
            file,
            invoiceNumber: invoiceResult.invoiceNumber,
            itemCount: invoiceResult.items.length
          });
        } catch (error) {
          results.failed++;
          results.failedFiles.push({
            file,
            error: error.message
          });
          
          logger.error(`Failed to process invoice: ${file}`, {
            module: 'invoice-service',
            requestId,
            file,
            error: error.message,
            stack: error.stack
          });
          
          // Move to error directory
          try {
            await this.archiveFile(filePath, false);
          } catch (archiveError) {
            logger.error(`Failed to move file to error directory: ${file}`, {
              module: 'invoice-service',
              requestId,
              file,
              error: archiveError.message
            });
          }
        }
      }
      
      // Send notification with results
      await this.sendProcessingResults(results, requestId);
      
      logger.info('Batch processing completed', {
        module: 'invoice-service',
        requestId,
        processed: results.processed,
        failed: results.failed
      });
      
      return results;
    } catch (error) {
      logger.error('Batch processing failed', {
        module: 'invoice-service',
        requestId,
        error: error.message,
        stack: error.stack
      });
      
      await notification.sendErrorNotification(
        'Invoice Batch Processing Failed',
        `Error: ${error.message}`,
        { module: 'invoice-service', requestId }
      );
      
      return {
        success: false,
        processed: 0,
        failed: 0,
        message: `Batch processing failed: ${error.message}`
      };
    }
  }
  
  /**
   * Update inventory based on invoice data
   * @param {Object} invoiceData - Processed invoice data
   * @param {string} requestId - Request ID for logging
   */
  async updateInventory(invoiceData, requestId) {
    if (!invoiceData || !invoiceData.items || invoiceData.items.length === 0) {
      return;
    }
    
    logger.info(`Updating inventory with ${invoiceData.items.length} items`, {
      module: 'invoice-service',
      requestId,
      invoiceNumber: invoiceData.invoiceNumber
    });
    
    try {
      // Get matched items that don't need review
      const itemsToUpdate = invoiceData.items.filter(item => 
        item.productId && !item.needsReview
      );
      
      if (itemsToUpdate.length === 0) {
        logger.info('No items to automatically update (all need review)', {
          module: 'invoice-service',
          requestId
        });
        return;
      }
      
      // Update inventory
      await database.updateInventoryFromInvoice(
        itemsToUpdate,
        invoiceData.invoiceNumber,
        invoiceData.invoiceDate,
        invoiceData.vendor
      );
      
      logger.info(`Updated inventory with ${itemsToUpdate.length} items`, {
        module: 'invoice-service',
        requestId,
        invoiceNumber: invoiceData.invoiceNumber
      });
    } catch (error) {
      logger.error('Failed to update inventory', {
        module: 'invoice-service',
        requestId,
        invoiceNumber: invoiceData.invoiceNumber,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Archive processed file
   * @param {string} filePath - Path to the file
   * @param {boolean} success - Whether processing was successful
   */
  async archiveFile(filePath, success) {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetDir = success ? this.archiveDir : this.errorDir;
    const targetPath = path.join(targetDir, `${timestamp}_${fileName}`);
    
    logger.info(`Moving file to ${success ? 'archive' : 'error'} directory`, {
      module: 'invoice-service',
      fileName,
      targetPath
    });
    
    try {
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Move file
      fs.renameSync(filePath, targetPath);
      
      logger.info(`File moved successfully: ${fileName}`, {
        module: 'invoice-service',
        success,
        targetPath
      });
    } catch (error) {
      logger.error(`Failed to move file: ${fileName}`, {
        module: 'invoice-service',
        error: error.message
      });
      
      throw new Error(`Failed to archive file: ${error.message}`);
    }
  }
  
  /**
   * Send notification with processing results
   * @param {Object} results - Processing results
   * @param {string} requestId - Request ID for logging
   */
  async sendProcessingResults(results, requestId) {
    if (!config.notifications.enabled || !config.notifications.email.enabled) {
      logger.info('Notifications are disabled, skipping results email', {
        module: 'invoice-service',
        requestId
      });
      return;
    }
    
    try {
      const subject = 'Invoice Processing Results';
      const message = this.formatResultsEmail(results);
      
      await notification.sendEmail(subject, message);
      
      logger.info('Processing results notification sent', {
        module: 'invoice-service',
        requestId
      });
    } catch (error) {
      logger.error('Failed to send processing results notification', {
        module: 'invoice-service',
        requestId,
        error: error.message
      });
    }
  }
  
  /**
   * Format results email
   * @param {Object} results - Processing results
   * @returns {string} Formatted email content
   */
  formatResultsEmail(results) {
    const timestamp = new Date().toISOString();
    let message = `
      <h2>Invoice Processing Results</h2>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p><strong>Summary:</strong> Processed ${results.processed} invoices, Failed ${results.failed}</p>
    `;
    
    if (results.successfulFiles.length > 0) {
      message += `
        <h3>Successfully Processed:</h3>
        <ul>
          ${results.successfulFiles.map(file => `<li>${file}</li>`).join('')}
        </ul>
      `;
    }
    
    if (results.failedFiles.length > 0) {
      message += `
        <h3>Failed Processing:</h3>
        <ul>
          ${results.failedFiles.map(item => 
            `<li>${item.file}: ${item.error}</li>`
          ).join('')}
        </ul>
      `;
    }
    
    return message;
  }
  
  /**
   * Process a single invoice file manually
   * @param {string} filePath - Path to invoice file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processSingleInvoice(filePath, options = {}) {
    const requestId = options.requestId || `manual-${Date.now()}`;
    
    logger.info('Processing single invoice file manually', {
      module: 'invoice-service',
      requestId,
      filePath
    });
    
    try {
      // Validate file exists and is allowed type
      if (!fs.existsSync(filePath)) {
        throw new ValidationError(`File not found: ${filePath}`, ['filePath'], 'FILE_NOT_FOUND');
      }
      
      const ext = path.extname(filePath).toLowerCase();
      if (!this.allowedFileTypes.includes(ext)) {
        throw new ValidationError(
          `Unsupported file type: ${ext}. Supported types: ${this.allowedFileTypes.join(', ')}`,
          ['filePath'],
          'UNSUPPORTED_FILE_TYPE'
        );
      }
      
      // Process invoice
      const result = await invoiceProcessor.processInvoice(filePath, {
        translateToFrench: options.translateToFrench !== false,
        requestId
      });
      
      // Update inventory if specified
      if (options.updateInventory) {
        await this.updateInventory(result, requestId);
      }
      
      // Archive file if requested
      if (options.archiveFile) {
        await this.archiveFile(filePath, true);
      }
      
      logger.info('Successfully processed single invoice', {
        module: 'invoice-service',
        requestId,
        invoiceNumber: result.invoiceNumber,
        itemCount: result.items.length
      });
      
      return {
        success: true,
        result
      };
    } catch (error) {
      logger.error('Failed to process single invoice', {
        module: 'invoice-service',
        requestId,
        filePath,
        error: error.message,
        stack: error.stack
      });
      
      // Move to error directory if requested
      if (options.archiveFile) {
        try {
          await this.archiveFile(filePath, false);
        } catch (archiveError) {
          logger.error('Failed to move file to error directory', {
            module: 'invoice-service',
            requestId,
            filePath,
            error: archiveError.message
          });
        }
      }
      
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new InvoiceService();