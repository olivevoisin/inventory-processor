// projects/inventory-processor/src/reports/inventoryReports.js

const fs = require('fs');
const path = require('path');

/**
 * Generate inventory report
 * @param {Array} data - Processed inventory data
 * @param {string} outputPath - Path to save the report
 * @param {string} format - Report format (json, csv)
 * @returns {Promise<string>} - Path to the generated report
 */
async function generateInventoryReport(data, outputPath, format = 'json') {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate report based on format
  switch (format.toLowerCase()) {
    case 'json':
      await generateJsonReport(data, outputPath);
      break;
    case 'csv':
      await generateCsvReport(data, outputPath);
      break;
    default:
      throw new Error(`Unsupported report format: ${format}`);
  }
  
  return outputPath;
}

/**
 * Generate JSON report
 * @param {Array} data - Processed inventory data
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
async function generateJsonReport(data, outputPath) {
  // Calculate summary statistics
  const summary = calculateSummary(data);
  
  // Prepare report content
  const report = {
    generated_at: new Date().toISOString(),
    summary,
    data
  };
  
  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
}

/**
 * Generate CSV report
 * @param {Array} data - Processed inventory data
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
async function generateCsvReport(data, outputPath) {
  if (data.length === 0) {
    fs.writeFileSync(outputPath, '');
    return;
  }
  
  // Get all unique headers
  const headers = new Set();
  data.forEach(item => {
    Object.keys(item).forEach(key => headers.add(key));
  });
  
  // Sort headers alphabetically
  const sortedHeaders = Array.from(headers).sort();
  
  // Create CSV header row
  let csvContent = sortedHeaders.join(',') + '\n';
  
  // Add data rows
  data.forEach(item => {
    const row = sortedHeaders.map(header => {
      const value = item[header];
      // Handle values with commas by quoting them
      if (value === undefined || value === null) {
        return '';
      }
      const stringValue = String(value);
      return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
    });
    csvContent += row.join(',') + '\n';
  });
  
  // Write to file
  fs.writeFileSync(outputPath, csvContent);
}

/**
 * Calculate summary statistics
 * @param {Array} data - Inventory data
 * @returns {Object} - Summary statistics
 */
function calculateSummary(data) {
  // Initialize summary object
  const summary = {
    total_items: data.length,
    total_value: 0,
    stock_status: {
      in_stock: 0,
      low_stock: 0,
      out_of_stock: 0
    }
  };
  
  // Calculate statistics
  data.forEach(item => {
    // Sum total value
    if (item.total_value) {
      summary.total_value += Number(item.total_value);
    }
    
    // Count by stock status
    if (item.stock_status) {
      summary.stock_status[item.stock_status] = 
        (summary.stock_status[item.stock_status] || 0) + 1;
    }
  });
  
  return summary;
}

module.exports = {
  generateInventoryReport
};