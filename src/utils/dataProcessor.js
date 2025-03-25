// projects/inventory-processor/src/utils/dataProcessor.js

/**
 * Process raw inventory data
 * @param {Array} data - Raw inventory data
 * @param {Object} options - Processing options
 * @returns {Array} - Processed inventory data
 */
function processInventoryData(data, options = {}) {
    // Clone the data to avoid modifying the original
    const processedData = JSON.parse(JSON.stringify(data));
    
    // Normalize field names (lowercase, remove spaces)
    processedData.forEach(item => {
      // Convert all keys to standardized format
      Object.keys(item).forEach(key => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        if (key !== normalizedKey) {
          item[normalizedKey] = item[key];
          delete item[key];
        }
      });
      
      // Add calculated fields
      if (item.quantity && item.price) {
        item.total_value = Number(item.quantity) * Number(item.price);
      }
      
      // Add stock status
      if (item.quantity) {
        const quantity = Number(item.quantity);
        if (quantity <= 0) {
          item.stock_status = 'out_of_stock';
        } else if (quantity < 10) {
          item.stock_status = 'low_stock';
        } else {
          item.stock_status = 'in_stock';
        }
      }
      
      // Format dates if present
      if (item.date) {
        try {
          const dateObj = new Date(item.date);
          item.formatted_date = dateObj.toISOString().split('T')[0];
        } catch (e) {
          // Keep original if date parsing fails
        }
      }
    });
    
    // Apply filters if specified in options
    if (options.filters) {
      Object.entries(options.filters).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          processedData = processedData.filter(item => item[field] == value);
        }
      });
    }
    
    return processedData;
  }
  
  module.exports = {
    processInventoryData
  };