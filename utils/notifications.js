// utils/notification.js

const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('./logger');

class NotificationService {
  constructor() {
    this.enabled = config.notifications.enabled;
    
    // Initialize email configuration
    if (this.enabled && config.notifications.email.enabled) {
      this.emailEnabled = true;
      this.emailConfig = config.notifications.email;
      
      // Create email transporter
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: {
          user: this.emailConfig.auth.user,
          pass: this.emailConfig.auth.pass
        }
      });
      
      logger.info('Email notification service initialized', {
        module: 'notification',
        host: this.emailConfig.host,
        from: this.emailConfig.from
      });
    } else {
      this.emailEnabled = false;
      logger.info('Email notifications are disabled', {
        module: 'notification'
      });
    }
  }
  
  /**
   * Send an email notification
   * @param {string} subject - Email subject
   * @param {string} message - Email message (HTML)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(subject, message, options = {}) {
    if (!this.emailEnabled) {
      logger.info('Email notifications disabled, skipping', {
        module: 'notification',
        subject
      });
      return { skipped: true };
    }
    
    try {
      const recipients = options.to || this.emailConfig.to;
      const from = options.from || this.emailConfig.from;
      
      logger.info(`Sending email notification: ${subject}`, {
        module: 'notification',
        to: recipients,
        from
      });
      
      const result = await this.transporter.sendMail({
        from,
        to: recipients,
        subject,
        html: message
      });
      
      logger.info('Email notification sent successfully', {
        module: 'notification',
        messageId: result.messageId,
        subject
      });
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send email notification', {
        module: 'notification',
        subject,
        error: error.message,
        stack: error.stack
      });
      
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Send error notification
   * @param {string} subject - Email subject
   * @param {string} errorMessage - Error message
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Send result
   */
  async sendErrorNotification(subject, errorMessage, context = {}) {
    const timestamp = new Date().toISOString();
    
    // Format HTML message
    const message = `
      <h2>Error Notification</h2>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Error:</strong> ${errorMessage}</p>
      
      <h3>Context:</h3>
      <pre>${JSON.stringify(context, null, 2)}</pre>
    `;
    
    return await this.sendEmail(`[ERROR] ${subject}`, message);
  }
  
  /**
   * Send critical alert notification
   * @param {string} subject - Alert subject
   * @param {string} message - Alert message
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Send result
   */
  async sendCriticalAlert(subject, message, context = {}) {
    const timestamp = new Date().toISOString();
    
    // Format HTML message
    const htmlMessage = `
      <h2 style="color: #cc0000;">Critical Alert</h2>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong> ${message}</p>
      
      <h3>Context:</h3>
      <pre>${JSON.stringify(context, null, 2)}</pre>
      
      <p style="color: #cc0000; font-weight: bold;">Immediate attention required!</p>
    `;
    
    // Use a different "to" address for critical alerts if configured
    const to = config.notifications.email.criticalTo || config.notifications.email.to;
    
    return await this.sendEmail(`[CRITICAL] ${subject}`, htmlMessage, { to });
  }
  
  /**
   * Send a low stock notification
   * @param {Array<Object>} lowStockItems - Items with low stock
   * @returns {Promise<Object>} Send result
   */
  async sendLowStockNotification(lowStockItems) {
    if (!lowStockItems || lowStockItems.length === 0) return { skipped: true };
    
    const timestamp = new Date().toISOString();
    
    // Format item table
    let itemsTable = `
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr>
          <th>Product</th>
          <th>Current Stock</th>
          <th>Reorder Point</th>
          <th>Unit</th>
          <th>Vendor</th>
        </tr>
    `;
    
    lowStockItems.forEach(item => {
      itemsTable += `
        <tr>
          <td>${item.name}</td>
          <td style="text-align: right; ${item.currentStock === 0 ? 'color: red; font-weight: bold;' : ''}">${item.currentStock}</td>
          <td style="text-align: right;">${item.reorderPoint}</td>
          <td>${item.unit}</td>
          <td>${item.vendor || 'Unknown'}</td>
        </tr>
      `;
    });
    
    itemsTable += '</table>';
    
    // Format HTML message
    const message = `
      <h2>Low Stock Notification</h2>
      <p><strong>Time:</strong> ${timestamp}</p>
      <p><strong>Number of items:</strong> ${lowStockItems.length}</p>
      
      <h3>Items that need reordering:</h3>
      ${itemsTable}
      
      <p>Please arrange to restock these items.</p>
    `;
    
    return await this.sendEmail('Low Stock Alert - Items Need Reordering', message);
  }
}

// Export singleton instance
module.exports = new NotificationService();