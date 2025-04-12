// projects/inventory-processor/src/index.js

const fs = require('fs');
const path = require('path');
const express = require('express');
const csv = require('csv-parser');
const { processInventoryData } = require('./utils/dataProcessor');
const { generateInventoryReport } = require('./reports/inventoryReports');
const { saveToDatabase } = require('./database/dbOperations');
const config = require('./config/config');
const logger = require('./utils/logger');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Inventory Processor</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          .container { max-width: 800px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Inventory Processor</h1>
          <p>Welcome to the Inventory Processing System.</p>
          <p>Use the API endpoints to process inventory data:</p>
          <ul>
            <li><code>POST /api/process</code> - Process inventory data</li>
            <li><code>GET /api/reports</code> - List generated reports</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// API Routes
app.post('/api/process', async (req, res) => {
  try {
    const options = req.body;
    const result = await processInventory('sample-data.json', options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/reports', (req, res) => {
  try {
    const reportsDir = config.reportOutputDir;
    
    if (!fs.existsSync(reportsDir)) {
      return res.json({ reports: [] });
    }
    
    const reports = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith('inventory-report-'))
      .map(file => ({
        filename: file,
        path: path.join(reportsDir, file),
        created: fs.statSync(path.join(reportsDir, file)).birthtime
      }));
    
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Main inventory processing function
 * @param {string} inputFilePath - Path to the input inventory file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processing results
 */
async function processInventory(inputFilePath, options = {}) {
  logger.info(`Starting inventory processing for: ${inputFilePath}`);
  
  try {
    // Validate input file
    if (!fs.existsSync(inputFilePath)) {
      throw new Error(`Input file not found: ${inputFilePath}`);
    }
    
    // Set default options
    const processingOptions = {
      generateReport: options.generateReport || false,
      saveToDb: options.saveToDb || false,
      reportFormat: options.reportFormat || 'json',
      ...options
    };
    
    // Read and parse inventory data
    const inventoryData = await readInventoryFile(inputFilePath);
    
    // Process inventory data
    const processedData = processInventoryData(inventoryData, processingOptions);
    
    // Generate reports if needed
    if (processingOptions.generateReport) {
      const reportPath = path.join(
        config.reportOutputDir, 
        `inventory-report-${Date.now()}.${processingOptions.reportFormat}`
      );
      await generateInventoryReport(processedData, reportPath, processingOptions.reportFormat);
      logger.info(`Report generated at: ${reportPath}`);
    }
    
    // Save to database if needed
    if (processingOptions.saveToDb) {
      await saveToDatabase(processedData);
      logger.info('Data saved to database successfully');
    }
    
    logger.info('Inventory processing completed successfully');
    return {
      success: true,
      processedItems: processedData.length,
      data: processedData
    };
  } catch (error) {
    logger.error(`Inventory processing failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Read and parse inventory file
 * @param {string} filePath - Path to inventory file
 * @returns {Promise<Array>} - Parsed inventory data
 */
function readInventoryFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (fileExtension === '.csv') {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    } else if (fileExtension === '.json') {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        resolve(Array.isArray(data) ? data : [data]);
      } catch (error) {
        reject(new Error(`Failed to parse JSON file: ${error.message}`));
      }
    } else {
      reject(new Error(`Unsupported file format: ${fileExtension}`));
    }
  });
}

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Open http://localhost:${PORT} in your browser`);
});

// Export functionality for use as a module
module.exports = {
  processInventory,
  readInventoryFile,
  app
};