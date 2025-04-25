/**
 * Notification utility module
 * Handles sending notifications via various channels: email, SMS, Slack
 */
const axios = require('axios');
const emailService = require('../services/email-service');
const smsService = require('../services/sms-service');
const logger = require('./logger');
const config = require('../config');

// Default configuration with fallbacks
const notificationsEnabled = config.notifications?.enabled !== false;
const emailConfig = config.notifications?.email || {};
const smsConfig = config.notifications?.sms || {};
const slackConfig = config.notifications?.slack || {};

/**
 * Notify the system administrator
 * @param {string} message - The notification message
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Notification result
 */
async function notifyAdmin(message, options = {}) {
  try {
    logger.info(`Sending admin notification: ${message}`);
    
    // Try email first
    try {
      if (emailConfig.enabled && emailConfig.adminEmail) {
        const emailResult = await emailService.sendEmail({
          to: emailConfig.adminEmail,
          from: emailConfig.from || 'system@example.com',
          subject: options.subject || 'Admin Notification',
          text: `Admin Notification: ${message}`,
          html: `<strong>Admin Notification:</strong><p>${message}</p>`,
        });
        return { success: true, channel: 'email', ...emailResult };
      }
    } catch (emailError) {
      logger.error(`Failed to send admin email: ${emailError.message}`);
      
      // Try SMS as fallback
      if (smsConfig.enabled && smsConfig.adminPhone) {
        const smsResult = await smsService.sendSms({
          to: smsConfig.adminPhone,
          from: smsConfig.from,
          body: `ADMIN ALERT: ${message}`
        });
        return { success: true, channel: 'sms', ...smsResult };
      }
    }
    
    // If we got here and haven't returned yet, we couldn't notify
    throw new Error('No notification channels available');
    
  } catch (error) {
    logger.error(`Admin notification failed: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Send a notification to Slack
 * @param {string} message - The message to send
 * @param {Object} options - Additional options like channel, username, icon
 * @returns {Promise<Object>} Notification result
 */
async function sendSlackNotification(message, options = {}) {
  try {
    if (!slackConfig.enabled || !slackConfig.webhookUrl) {
      logger.warn('Slack notifications are disabled');
      return { 
        success: false, 
        error: 'Slack notifications disabled' 
      };
    }

    logger.info(`Sending Slack notification: ${message}`);

    const response = await axios.post(slackConfig.webhookUrl, {
      channel: options.channel || slackConfig.channel,
      username: options.username || 'Inventory System',
      text: message,
      icon_emoji: options.icon || ':robot_face:'
    });

    return { 
      success: true, 
      data: response.data 
    };
  } catch (error) {
    logger.error(`Slack notification failed: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Send a notification through multiple channels
 * @param {string} message - The notification message
 * @param {Object} options - Channel options (email, sms, slack)
 * @returns {Promise<Object>} Notification results
 */
async function notify(message, options = {}) {
  const results = {
    success: false,
    channels: {}
  };

  try {
    // Determine which channels to use
    const useChannel = options.channel 
      ? (channel) => options.channel === channel
      : () => true;
      
    // Process all enabled channels
    if (notificationsEnabled) {
      // Email channel
      if (useChannel('email') && emailConfig.enabled) {
        try {
          const emailResult = await emailService.sendEmail({
            to: options.email || emailConfig.adminEmail,
            from: emailConfig.from || 'system@example.com',
            subject: options.subject || 'System Notification',
            text: message,
            html: `<p>${message}</p>`
          });
          results.channels.email = { success: true, ...emailResult };
        } catch (emailError) {
          results.channels.email = { success: false, error: emailError.message };
          logger.error(`Email notification failed: ${emailError.message}`);
        }
      }

      // SMS channel
      if (useChannel('sms') && smsConfig.enabled) {
        try {
          const smsResult = await smsService.sendSms({
            to: options.phone || smsConfig.adminPhone,
            from: smsConfig.from,
            body: message
          });
          results.channels.sms = { success: true, ...smsResult };
        } catch (smsError) {
          results.channels.sms = { success: false, error: smsError.message };
          logger.error(`SMS notification failed: ${smsError.message}`);
        }
      }

      // Slack channel
      if (useChannel('slack') && slackConfig.enabled) {
        try {
          const slackResult = await sendSlackNotification(message, options);
          results.channels.slack = slackResult;
        } catch (slackError) {
          results.channels.slack = { success: false, error: slackError.message };
          logger.error(`Slack notification failed: ${slackError.message}`);
        }
      }
    } else {
      logger.warn('Notifications are disabled');
    }

    // Determine overall success (true if any channel succeeded)
    results.success = Object.values(results.channels).some(channel => channel.success);
    
    return results;
  } catch (error) {
    logger.error(`Notification failed: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      channels: results.channels 
    };
  }
}

module.exports = {
  notifyAdmin,
  sendSlackNotification,
  notify
};
