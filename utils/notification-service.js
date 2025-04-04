/**
 * Service de notification
 * Gère l'envoi de notifications par email, SMS, etc.
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');
const config = require('../config');

// Créer un transporteur pour les emails si configuré
let emailTransporter = null;
if (config.email && config.email.host) {
  emailTransporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.auth.user,
      pass: config.email.auth.pass
    }
  });
}

/**
 * Envoyer un email
 * @param {Object} options - Options de l'email
 * @returns {Promise<Object>} Résultat de l'envoi
 */
async function sendEmail(options) {
  if (!emailTransporter) {
    logger.warn('Service d\'email non configuré, email non envoyé');
    return { success: false, message: 'Service d\'email non configuré' };
  }
  
  try {
    const { to, subject, text, html } = options;
    
    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      text: text || '',
      html: html || ''
    };
    
    const info = await emailTransporter.sendMail(mailOptions);
    
    logger.info(`Email envoyé: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Notifier les administrateurs
 * @param {string} subject - Sujet de la notification
 * @param {string} message - Message de la notification
 * @param {Object} data - Données supplémentaires
 * @returns {Promise<Object>} Résultat de la notification
 */
async function notifyAdmins(subject, message, data = {}) {
  if (!config.adminEmail) {
    logger.warn('Email d\'administrateur non configuré, notification non envoyée');
    return { success: false, message: 'Email d\'administrateur non configuré' };
  }
  
  // Créer le contenu HTML
  const html = `
    <h1>${subject}</h1>
    <p>${message}</p>
    ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
  `;
  
  return sendEmail({
    to: config.adminEmail,
    subject: `[ADMIN] ${subject}`,
    text: `${message}\n\n${JSON.stringify(data, null, 2)}`,
    html
  });
}

/**
 * Envoyer un rapport de traitement de factures
 * @param {Object} results - Résultats du traitement
 * @returns {Promise<Object>} Résultat de l'envoi
 */
async function sendInvoiceProcessingReport(results) {
  const subject = 'Rapport de traitement des factures';
  
  // Créer le contenu HTML
  const html = `
    <h1>Rapport de traitement des factures</h1>
    <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
    
    <h2>Résumé</h2>
    <ul>
      <li>Factures traitées avec succès: <strong>${results.processed}</strong></li>
      <li>Factures en échec: <strong>${results.failed}</strong></li>
    </ul>
    
    ${results.successItems && results.successItems.length > 0 ? `
      <h2>Factures traitées avec succès</h2>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr>
          <th>Fichier</th>
          <th>ID Facture</th>
          <th>Date</th>
          <th>Fournisseur</th>
          <th>Nombre d'articles</th>
        </tr>
        ${results.successItems.map(item => `
          <tr>
            <td>${item.file}</td>
            <td>${item.invoiceId}</td>
            <td>${item.date}</td>
            <td>${item.supplier}</td>
            <td>${item.itemCount}</td>
          </tr>
        `).join('')}
      </table>
    ` : ''}
    
    ${results.failedItems && results.failedItems.length > 0 ? `
      <h2>Factures en échec</h2>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr>
          <th>Fichier</th>
          <th>Erreur</th>
        </tr>
        ${results.failedItems.map(item => `
          <tr>
            <td>${item.file}</td>
            <td>${item.error}</td>
          </tr>
        `).join('')}
      </table>
    ` : ''}
  `;
  
  return notifyAdmins(subject, 'Veuillez trouver ci-joint le rapport de traitement des factures.', {
    html,
    results
  });
}

module.exports = {
  sendEmail,
  notifyAdmins,
  sendInvoiceProcessingReport
};
