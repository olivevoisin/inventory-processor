/**
 * Module de traitement des factures
 * Gère le traitement OCR des factures en français et japonais
 */
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const databaseUtils = require('../utils/database-utils');

/**
 * Process a single invoice
 * @param {string} filePath - Path to the invoice file
 * @param {string} location - Location (Bar, Kitchen, etc.)
 * @returns {Promise<Object>} - Processed invoice data
 */
async function processInvoice(filePath, location) {
  try {
    logger.info(`Traitement de la facture: ${filePath} pour l'emplacement: ${location}`);
    
    // Extract text from the invoice (OCR would be used here in a real implementation)
    const extractedText = await extractTextFromFile(filePath);
    
    // Detect language
    const detectedLanguage = detectLanguage(extractedText);
    logger.info(`Langue détectée: ${detectedLanguage}`);
    
    // Extract invoice data based on detected language
    let invoiceData;
    if (detectedLanguage === 'jp') {
      invoiceData = extractJapaneseInvoiceData(extractedText);
    } else {
      // Default to French
      invoiceData = extractFrenchInvoiceData(extractedText);
    }
    
    // Add location to the invoice data
    invoiceData.location = location;
    
    return invoiceData;
  } catch (error) {
    logger.error(`Erreur lors du traitement de la facture: ${error.message}`);
    throw error;
  }
}

/**
 * Extract text from a file (PDF or image)
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(filePath) {
  // For testing purposes, return mock text based on file extension
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    return "Facture\nNuméro: FAC-2023-001\nDate: 15/03/2023\nFournisseur: Vins de France\n5 bouteilles Vin Rouge 150€\n3 bouteilles Champagne 210€\nTotal: 360€";
  } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    return "インボイス\n請求番号: INV-2023-002\n日付: 2023/03/15\n発行元: 日本酒株式会社\n5本 ウォッカ 15000円\n10本 ワイン 16000円\n合計: 31000円";
  } else {
    // Default text for unknown file types
    return "Facture test\nDate: 01/01/2023\n10 produits divers\nTotal: 100€";
  }
}

/**
 * Detect language from text
 * @param {string} text - Text to analyze
 * @returns {string} - Detected language code ('fr' or 'jp')
 */
function detectLanguage(text) {
  // Simple detection: check for Japanese characters
  const japaneseChars = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]/;
  return japaneseChars.test(text) ? 'jp' : 'fr';
}

/**
 * Extract French invoice data
 * @param {string} text - Invoice text
 * @returns {Object} - Structured invoice data
 */
function extractFrenchInvoiceData(text) {
  // Mock implementation for testing
  const invoiceMatch = text.match(/Facture.*Numéro:\s*([^\n]+)/i);
  const dateMatch = text.match(/Date:\s*([0-9\/]+)/i);
  const supplierMatch = text.match(/Fournisseur:\s*([^\n]+)/i);
  const totalMatch = text.match(/Total:\s*([0-9€,\.]+)/i);
  
  // Extract items (simplified regex for demonstration)
  const itemRegex = /(\d+)\s+(?:bouteilles?|cannettes?|boîtes?)\s+([^\n\d]+)\s+([0-9€,\.]+)/g;
  const items = [];
  let match;
  
  while ((match = itemRegex.exec(text)) !== null) {
    items.push({
      product: match[2].trim(),
      count: parseInt(match[1], 10),
      price: match[3].trim()
    });
  }
  
  return {
    invoiceId: invoiceMatch ? invoiceMatch[1].trim() : `INV-FR-${Date.now()}`,
    date: dateMatch ? dateMatch[1].trim() : new Date().toLocaleDateString('fr-FR'),
    supplier: supplierMatch ? supplierMatch[1].trim() : 'Fournisseur inconnu',
    items: items,
    total: totalMatch ? totalMatch[1].trim() : '0€'
  };
}

/**
 * Extract Japanese invoice data
 * @param {string} text - Invoice text
 * @returns {Object} - Structured invoice data
 */
function extractJapaneseInvoiceData(text) {
  // Mock implementation for testing
  const invoiceMatch = text.match(/請求番号:\s*([^\n]+)/i);
  const dateMatch = text.match(/日付:\s*([0-9\/]+)/i);
  const supplierMatch = text.match(/発行元:\s*([^\n]+)/i);
  const totalMatch = text.match(/合計:\s*([0-9円,\.]+)/i);
  
  // Extract items (simplified regex for demonstration)
  const itemRegex = /(\d+)本\s+([^\n\d]+)\s+([0-9円,\.]+)/g;
  const items = [];
  let match;
  
  while ((match = itemRegex.exec(text)) !== null) {
    items.push({
      product: match[2].trim(),
      count: parseInt(match[1], 10),
      price: match[3].trim()
    });
  }
  
  return {
    invoiceId: invoiceMatch ? invoiceMatch[1].trim() : `INV-JP-${Date.now()}`,
    date: dateMatch ? dateMatch[1].trim() : new Date().toLocaleDateString('ja-JP'),
    supplier: supplierMatch ? supplierMatch[1].trim() : '不明なサプライヤー',
    items: items,
    total: totalMatch ? totalMatch[1].trim() : '0円'
  };
}

/**
 * Initialize OCR services
 * @returns {Promise<void>}
 */
async function initialize() {
  logger.info('Initializing OCR services');
  // In a real implementation, this would initialize OCR libraries
  return Promise.resolve();
}

/**
 * Terminate OCR services
 * @returns {Promise<void>}
 */
async function terminate() {
  logger.info('Terminating OCR services');
  // In a real implementation, this would clean up OCR resources
  return Promise.resolve();
}

module.exports = {
  processInvoice,
  extractTextFromFile,
  detectLanguage,
  initialize,
  terminate
};
