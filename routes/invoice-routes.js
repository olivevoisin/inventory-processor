/**
 * Routes pour le traitement des factures
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const invoiceService = require('../modules/invoice-service');
const { authenticateApiKey } = require('../middleware/auth');
const { validateRequestBody } = require('../middleware/validation');
const { asyncHandler } = require('../utils/error-handler');
const logger = require('../utils/logger');
const config = require('../config');

// Configuration du stockage pour les uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = config.uploads.invoiceDir;
    
    try {
      // Créer le répertoire s'il n'existe pas
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `invoice-${timestamp}${extension}`;
    cb(null, filename);
  }
});

// Créer l'uploader de fichiers
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Mo
  },
  fileFilter: (req, file, cb) => {
    // Vérifier les types de fichiers autorisés
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const extension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non pris en charge. Seuls PDF, JPG et PNG sont acceptés.'));
    }
  }
});

/**
 * @route GET /api/invoices/:id
 * @desc Récupérer une facture par son ID
 * @access Protégé
 */
router.get('/:id', authenticateApiKey, asyncHandler(async (req, res) => {
  const invoiceId = req.params.id;
  
  // Dans une vraie implémentation, cela récupérerait depuis la base de données
  // Pour les besoins du test, on renvoie un exemple
  
  if (invoiceId === 'inv-123') {
    return res.json({
      id: 'inv-123',
      invoiceId: 'FAC-2023-001',
      date: '2023-03-15',
      supplier: 'Vins de France',
      items: [
        { product: 'Vin Rouge', count: 5, price: '150€' },
        { product: 'Champagne', count: 3, price: '210€' }
      ],
      total: '360€',
      location: 'Bar'
    });
  }
  
  // Si l'ID n'est pas trouvé
  return res.status(404).json({
    success: false,
    error: `Facture avec ID ${invoiceId} non trouvée`
  });
}));

/**
 * @route POST /api/invoices/process
 * @desc Traiter une facture téléchargée
 * @access Protégé
 */
router.post('/process', 
  authenticateApiKey,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    // Vérifier si un fichier a été téléchargé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }
    
    // Récupérer le chemin du fichier et l'emplacement
    const filePath = req.file.path;
    const location = req.body.location || 'Bar';
    
    logger.info(`Traitement de la facture téléchargée: ${req.file.originalname}, emplacement: ${location}`);
    
    // Traiter la facture
    const result = await invoiceService.processSingleInvoice(filePath, location);
    
    // Renvoyer le résultat
    return res.json({
      success: true,
      result
    });
  })
);

/**
 * @route POST /api/invoices/process-batch
 * @desc Traiter toutes les factures dans un répertoire
 * @access Protégé
 */
router.post('/process-batch',
  authenticateApiKey,
  validateRequestBody(['sourceDir']),
  asyncHandler(async (req, res) => {
    const { sourceDir, processedDir = `${sourceDir}/processed` } = req.body;
    
    logger.info(`Traitement par lot des factures depuis ${sourceDir}`);
    
    // Traiter toutes les factures
    const result = await invoiceService.processInvoices(sourceDir, processedDir);
    
    // Renvoyer le résultat
    return res.json({
      success: true,
      result
    });
  })
);

module.exports = router;
