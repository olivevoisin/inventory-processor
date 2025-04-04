/**
 * Invoice Scheduler
 * 
 * Scheduled job that runs twice monthly to process invoices automatically.
 * - Scans directory for new invoice files
 * - Processes invoices using the invoice-processor module
 * - Archives processed files
 * - Sends email notifications (if enabled)
 */

const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

// Import application modules
const invoiceProcessor = require('../modules/invoice-processor');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Process all invoice files in the specified directory
 */
async function processInvoices() {
  logger.info('Starting scheduled invoice processing job');
  
  try {
    const invoiceDir = config.invoiceProcessing.directory;
    const archiveDir = path.join(invoiceDir, 'archive');
    
    // Ensure archive directory exists
    await ensureDirectoryExists(archiveDir);
    
    // Get all files in the invoice directory
    const files = await fs.readdir(invoiceDir);
    const invoiceFiles = files.filter(file => {
      // Skip directories and already processed files
      const filePath = path.join(invoiceDir, file);
      return !file.startsWith('.') && 
             !file.includes('processed_') && 
             path.extname(file).match(/\.(pdf|jpg|jpeg|png)$/i) &&
             filePath !== archiveDir;
    });
    
    if (invoiceFiles.length === 0) {
      logger.info('No new invoice files found to process');
      return;
    }
    
    logger.info(`Found ${invoiceFiles.length} invoice files to process`);
    
    // Process each invoice file
    const results = {
      success: [],
      failure: []
    };
    
    for (const file of invoiceFiles) {
      const filePath = path.join(invoiceDir, file);
      
      try {
        logger.info(`Processing invoice file: ${file}`);
        
        // Process the invoice using the existing invoice processor module
        const processResult = await invoiceProcessor.processInvoice(filePath);
        
        // Move file to archive with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivedFileName = `processed_${timestamp}_${file}`;
        const archivedFilePath = path.join(archiveDir, archivedFileName);
        
        await fs.rename(filePath, archivedFilePath);
        
        logger.info(`Successfully processed and archived invoice: ${file}`);
        results.success.push({
          file,
          processResult
        });
      } catch (error) {
        logger.error(`Failed to process invoice file ${file}: ${error.message}`);
        results.failure.push({
          file,
          error: error.message
        });
      }
    }
    
    // Send notification email if enabled
    if (config.notifications && config.notifications.email && config.notifications.email.enabled) {
      await sendNotificationEmail(results);
    }
    
    logger.info(`Invoice processing job completed. Success: ${results.success.length}, Failures: ${results.failure.length}`);
    
    return results;
  } catch (error) {
    logger.error(`Error in invoice processing job: ${error.message}`);
    throw error;
  }
}

/**
 * Ensure a directory exists, create it if it doesn't
 */
async function ensureDirectoryExists(directory) {
  try {
    await fs.access(directory);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(directory, { recursive: true });
    logger.info(`Created directory: ${directory}`);
  }
}

/**
 * Send email notification with processing results
 */
async function sendNotificationEmail(results) {
  try {
    const { host, port, secure, auth, from, to } = config.notifications.email;
    
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth
    });
    
    const successCount = results.success.length;
    const failureCount = results.failure.length;
    
    // Create email content
    const subject = `Invoice Processing Report: ${successCount} succeeded, ${failureCount} failed`;
    
    let htmlContent = `
      <h2>Invoice Processing Report</h2>
      <p>Job ran at: ${new Date().toLocaleString()}</p>
      <p>Total processed: ${successCount + failureCount}</p>
      <p>Successfully processed: ${successCount}</p>
      <p>Failed to process: ${failureCount}</p>
    `;
    
    // Add details for successful invoices
    if (successCount > 0) {
      htmlContent += `
        <h3>Successfully Processed Invoices:</h3>
        <ul>
          ${results.success.map(item => `<li>${item.file}</li>`).join('')}
        </ul>
      `;
    }
    
    // Add details for failed invoices
    if (failureCount > 0) {
      htmlContent += `
        <h3>Failed Invoices:</h3>
        <ul>
          ${results.failure.map(item => `<li>${item.file}: ${item.error}</li>`).join('')}
        </ul>
      `;
    }
    
    // Send the email
    await transporter.sendMail({
      from,
      to,
      subject,
      html: htmlContent
    });
    
    logger.info('Sent invoice processing notification email');
  } catch (error) {
    logger.error(`Failed to send notification email: ${error.message}`);
  }
}

/**
 * Initialize the invoice scheduler
 */
function initializeScheduler() {
  const scheduleExpression = config.invoiceProcessing.schedule || '0 0 1,15 * *'; // Default: midnight on 1st and 15th
  
  logger.info(`Initializing invoice scheduler with schedule: ${scheduleExpression}`);
  
  // Schedule the job using node-cron
  cron.schedule(scheduleExpression, async () => {
    try {
      await processInvoices();
    } catch (error) {
      logger.error(`Scheduled invoice processing failed: ${error.message}`);
    }
  });
  
  logger.info('Invoice scheduler initialized successfully');
}

// Export functions for use in other modules or tests
module.exports = {
  initializeScheduler,
  processInvoices // Exported for manual triggering or testing
};