/**
 * Manual Invoice Processing Trigger
 * 
 * This script allows manually triggering the invoice processing
 * without waiting for the scheduled time.
 */

const invoiceScheduler = require('./invoice-scheduler');
const logger = require('../utils/logger');

async function runManualProcess() {
  try {
    logger.info('Starting manual invoice processing');
    
    const results = await invoiceScheduler.processInvoices();
    
    const successCount = results?.success?.length || 0;
    const failureCount = results?.failure?.length || 0;
    
    logger.info(`Manual invoice processing completed. Processed ${successCount + failureCount} files.`);
    logger.info(`Success: ${successCount}, Failures: ${failureCount}`);
    
    return results;
  } catch (error) {
    logger.error(`Manual invoice processing failed: ${error.message}`);
    throw error;
  }
}

// Run the process if script is executed directly
if (require.main === module) {
  runManualProcess()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = { runManualProcess };
}