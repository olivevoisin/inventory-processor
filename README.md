# inventory-processor
# Invoice Processing Scheduler

This module adds scheduled invoice processing capabilities to the inventory management application. It automatically processes invoice files on the 1st and 15th of each month, with support for email notifications and error handling.

## Features

- **Scheduled Processing**: Automatically runs on the 1st and 15th of each month
- **File Management**: Scans directories for new invoices and archives processed files
- **Error Handling**: Comprehensive logging and error management
- **Email Notifications**: Optional email reports for processing success/failure
- **Manual Triggering**: Support for on-demand processing
- **Cloud Run Integration**: Works with the existing deployment process

## Installation

1. Add the new files to your project:
   - `scripts/invoice-scheduler.js` - Core scheduler logic
   - `scripts/invoice-service.js` - Service entry point
   - `scripts/process-invoices-now.js` - Manual trigger

2. Update your `package.json` to include the new dependencies:
   ```bash
   npm install node-cron nodemailer --save
   ```

3. Ensure your `config.js` includes the invoice processing settings (see example)

## Configuration

Add the following to your existing `config.js` file:

```javascript
invoiceProcessing: {
  directory: process.env.INVOICE_DIR || './data/invoices',
  schedule: process.env.INVOICE_SCHEDULE || '0 0 1,15 * *',
  allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
  archiveProcessed: true,
  maxFileSizeMB: 10
},
notifications: {
  email: {
    enabled: process.env.EMAIL_NOTIFICATIONS === 'true' || false,
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || ''
    },
    from: process.env.EMAIL_FROM || 'inventory-system@example.com',
    to: process.env.EMAIL_TO || 'admin@example.com'
  }
}
```

## Usage

### Running the Scheduler

You can run the invoice scheduler in several ways:

1. **Standalone**: Run just the scheduler service
   ```bash
   node ./scripts/invoice-service.js
   ```

2. **Integrated**: Update your `server.js` to include the scheduler
   ```javascript
   const invoiceService = require('./scripts/invoice-service');
   
   // Start your Express server
   app.listen(port, () => {
     console.log(`Server running on port ${port}`);
     
     // Start the invoice scheduler
     invoiceService.start();
   });
   ```

3. **Manual Processing**: Trigger invoice processing on demand
   ```bash
   node ./scripts/process-invoices-now.js
   ```

### Deployment to Cloud Run

1. Update your Dockerfile to include the new scripts and dependencies
2. Set the environment variables in Cloud Run:
   - `INVOICE_DIR`: Path to invoice files
   - `INVOICE_SCHEDULE`: Cron schedule (default: `0 0 1,15 * *`)
   - `EMAIL_NOTIFICATIONS`: Set to 'true' to enable email reports
   - Other email configuration variables if needed

3. Deploy using your existing Cloud Build configuration

## Monitoring and Logs

All invoice processing activities are logged through the application's existing logging system. You can monitor the logs in Cloud Run or your local environment.

Email notifications provide a summary of each processing run, including success counts and details of any failures.

## Directory Structure

The system expects the following directory structure:

```
/data/invoices/            # Base directory for invoices (configurable)
  /new-invoice1.pdf        # New invoices to be processed
  /new-invoice2.jpg
  /archive/                # Created automatically
    /processed_[timestamp]_invoice1.pdf
    /processed_[timestamp]_invoice2.jpg
```

## Testing

You can test the invoice processing functionality by:

1. Placing some test invoice files in the configured directory
2. Running the manual trigger script:
   ```bash
   node ./scripts/process-invoices-now.js
   ```
3. Checking the logs and archive directory to verify processing
