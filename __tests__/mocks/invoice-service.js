const fs = require('fs');
const path = require('path');
// Note: node-cron is mocked at the module level
const cron = require('node-cron');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const invoiceProcessor = require('../../../modules/invoice-processor');
const translationService = require('../../../modules/translation-service');
const dbUtils = require('../../../utils/database-utils');

// Directory for storing invoices
const uploadDir = config.uploadDir || './uploads/invoices';

// Process all invoices in the upload directory
async function processIncomingInvoices() {
  logger.info('Starting invoice processing');
  
  try {
    // Ensure the upload directory exists
    try {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }
    
    // Get all PDF files in the upload directory
    const files = await fs.promises.readdir(uploadDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    logger.info(`Found ${pdfFiles.length} PDF files to process`);
    
    if (pdfFiles.length === 0) {
      return { success: true, processed: 0 };
    }
    
    // Process each PDF file
    let processed = 0;
    for (const pdfFile of pdfFiles) {
      try {
        const pdfPath = path.join(uploadDir, pdfFile);
        const pdfData = await fs.promises.readFile(pdfPath);
        
        // Extract invoice data
        const invoiceData = await invoiceProcessor.extractInvoiceData(pdfData);
        
        // Translate Japanese product names to French
        if (invoiceData.items && invoiceData.items.length > 0) {
          invoiceData.items = await translationService.batchTranslate(invoiceData.items);
        }
        
        // Save to database
        await dbUtils.saveInvoice(invoiceData);
        
        // Add items to inventory
        if (invoiceData.items && invoiceData.items.length > 0) {
          await dbUtils.saveInventoryItems(invoiceData.items);
        }
        
        // Delete the processed file
        await fs.promises.unlink(pdfPath);
        
        processed++;
        logger.info(`Successfully processed invoice: ${pdfFile}`);
      } catch (err) {
        logger.error(`Error processing invoice ${pdfFile}: ${err.message}`);
      }
    }
    
    return { success: true, processed };
  } catch (err) {
    logger.error(`Invoice processing failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Schedule regular invoice processing
function scheduleInvoiceProcessing() {
  const schedule = config.invoiceProcessingInterval || '0 * * * *'; // Default to hourly
  
  logger.info(`Scheduling invoice processing with schedule: ${schedule}`);
  
  const task = cron.schedule(schedule, async () => {
    await processIncomingInvoices();
  });
  
  task.start();
  
  return task;
}

module.exports = {
  processIncomingInvoices,
  scheduleInvoiceProcessing
};
