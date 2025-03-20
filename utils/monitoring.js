// utils/monitoring.js

const config = require('../config');
const logger = require('./logger');

class MonitoringService {
  constructor() {
    this.enabled = config.monitoring.enabled;
    this.persistenceEnabled = config.monitoring.enablePersistence;
    this.metricsData = {
      apiCalls: {},
      errors: {},
      responseTimes: {},
      processingJobs: {}
    };
    
    // Track app start time
    this.startTime = Date.now();
    
    logger.info('Monitoring service initialized', {
      module: 'monitoring',
      enabled: this.enabled,
      persistenceEnabled: this.persistenceEnabled
    });
    
    // Set up periodic persistence if enabled
    if (this.enabled && this.persistenceEnabled) {
      const persistIntervalMs = config.monitoring.persistIntervalMinutes * 60 * 1000;
      this.persistInterval = setInterval(() => {
        this.persistMetrics();
      }, persistIntervalMs);
      
      logger.info(`Metric persistence scheduled every ${config.monitoring.persistIntervalMinutes} minutes`, {
        module: 'monitoring'
      });
    }
    
    // Set up periodic reporting if enabled
    if (this.enabled && config.monitoring.enablePeriodicReporting) {
      const reportingIntervalMs = config.monitoring.reportingIntervalMinutes * 60 * 1000;
      this.reportingInterval = setInterval(() => {
        this.generateReport();
      }, reportingIntervalMs);
      
      logger.info(`Metric reporting scheduled every ${config.monitoring.reportingIntervalMinutes} minutes`, {
        module: 'monitoring'
      });
    }
  }
  
  /**
   * Track API call
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   */
  trackApiCall(endpoint, method) {
    if (!this.enabled) return;
    
    const key = `${method}:${endpoint}`;
    this.metricsData.apiCalls[key] = (this.metricsData.apiCalls[key] || 0) + 1;
    
    logger.debug(`API call tracked: ${method} ${endpoint}`, {
      module: 'monitoring',
      endpoint,
      method,
      count: this.metricsData.apiCalls[key]
    });
  }
  
  /**
   * Track error
   * @param {string} source - Error source
   * @param {number} statusCode - HTTP status code
   */
  trackError(source, statusCode) {
    if (!this.enabled) return;
    
    const key = `${source}:${statusCode}`;
    this.metricsData.errors[key] = (this.metricsData.errors[key] || 0) + 1;
    
    // Check if error rate is above threshold
    this.checkErrorThresholds(source);
    
    logger.debug(`Error tracked: ${source} (${statusCode})`, {
      module: 'monitoring',
      source,
      statusCode,
      count: this.metricsData.errors[key]
    });
  }
  
  /**
   * Track response time
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Response time in ms
   */
  trackResponseTime(endpoint, duration) {
    if (!this.enabled) return;
    
    if (!this.metricsData.responseTimes[endpoint]) {
      this.metricsData.responseTimes[endpoint] = {
        count: 0,
        total: 0,
        max: 0,
        min: Number.MAX_SAFE_INTEGER
      };
    }
    
    const stats = this.metricsData.responseTimes[endpoint];
    stats.count++;
    stats.total += duration;
    stats.max = Math.max(stats.max, duration);
    stats.min = Math.min(stats.min, duration);
    
    // Check if response time is above threshold
    this.checkResponseTimeThresholds(endpoint, duration);
    
    logger.debug(`Response time tracked: ${endpoint} (${duration}ms)`, {
      module: 'monitoring',
      endpoint,
      duration,
      average: Math.round(stats.total / stats.count)
    });
  }
  
  /**
   * Track processing job
   * @param {string} jobType - Type of processing job
   * @param {string} status - Job status (started, completed, failed)
   * @param {number} duration - Processing time in ms (if completed/failed)
   */
  trackProcessingJob(jobType, status, duration = null) {
    if (!this.enabled) return;
    
    if (!this.metricsData.processingJobs[jobType]) {
      this.metricsData.processingJobs[jobType] = {
        started: 0,
        completed: 0,
        failed: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    }
    
    const stats = this.metricsData.processingJobs[jobType];
    
    if (status === 'started') {
      stats.started++;
    } else if (status === 'completed') {
      stats.completed++;
      if (duration !== null) {
        stats.totalDuration += duration;
        stats.avgDuration = stats.totalDuration / stats.completed;
      }
    } else if (status === 'failed') {
      stats.failed++;
      if (duration !== null) {
        stats.totalDuration += duration;
        stats.avgDuration = stats.totalDuration / (stats.completed + stats.failed);
      }
    }
    
    logger.debug(`Processing job tracked: ${jobType} (${status})`, {
      module: 'monitoring',
      jobType,
      status,
      duration,
      stats
    });
  }
  
 /**
   * Check error thresholds and trigger alerts if necessary
   * @param {string} source - Error source
   */
 checkErrorThresholds(source) {
    if (!this.enabled || !config.monitoring.alertThresholds) return;
    
    // Count total requests for this source
    const totalRequests = Object.keys(this.metricsData.apiCalls)
      .filter(key => key.includes(source))
      .reduce((sum, key) => sum + this.metricsData.apiCalls[key], 0);
    
    // Count errors for this source
    const totalErrors = Object.keys(this.metricsData.errors)
      .filter(key => key.includes(source))
      .reduce((sum, key) => sum + this.metricsData.errors[key], 0);
    
    // Calculate error rate
    if (totalRequests > 0) {
      const errorRate = totalErrors / totalRequests;
      
      // Check against threshold
      if (errorRate > config.monitoring.alertThresholds.errorRate) {
        logger.warn(`Error rate threshold exceeded for ${source}`, {
          module: 'monitoring',
          source,
          errorRate: errorRate.toFixed(2),
          threshold: config.monitoring.alertThresholds.errorRate,
          totalRequests,
          totalErrors
        });
        
        // Trigger alert if notification service is available
        try {
          const notification = require('./notification');
          notification.sendCriticalAlert(
            'Error Rate Threshold Exceeded',
            `The error rate for ${source} is ${(errorRate * 100).toFixed(2)}%, which exceeds the threshold of ${(config.monitoring.alertThresholds.errorRate * 100).toFixed(2)}%.`,
            {
              source,
              errorRate,
              threshold: config.monitoring.alertThresholds.errorRate,
              totalRequests,
              totalErrors
            }
          );
        } catch (error) {
          logger.error('Failed to send error rate alert', {
            module: 'monitoring',
            error: error.message
          });
        }
      }
    }
  }
  
  /**
   * Check response time thresholds and trigger alerts if necessary
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Response time in ms
   */
  checkResponseTimeThresholds(endpoint, duration) {
    if (!this.enabled || !config.monitoring.alertThresholds) return;
    
    // Check against threshold
    if (duration > config.monitoring.alertThresholds.responseTime) {
      logger.warn(`Response time threshold exceeded for ${endpoint}`, {
        module: 'monitoring',
        endpoint,
        duration,
        threshold: config.monitoring.alertThresholds.responseTime
      });
      
      // Trigger alert if notification service is available
      try {
        const notification = require('./notification');
        notification.sendCriticalAlert(
          'Response Time Threshold Exceeded',
          `The response time for ${endpoint} was ${duration}ms, which exceeds the threshold of ${config.monitoring.alertThresholds.responseTime}ms.`,
          {
            endpoint,
            duration,
            threshold: config.monitoring.alertThresholds.responseTime
          }
        );
      } catch (error) {
        logger.error('Failed to send response time alert', {
          module: 'monitoring',
          error: error.message
        });
      }
    }
  }
  
  /**
   * Get collected metrics
   * @returns {Object} Current metrics data
   */
  getMetrics() {
    if (!this.enabled) {
      return {
        enabled: false,
        message: 'Monitoring is disabled'
      };
    }
    
    // Calculate uptime
    const uptime = Date.now() - this.startTime;
    
    // Calculate summary statistics
    const apiCallsTotal = Object.values(this.metricsData.apiCalls)
      .reduce((sum, count) => sum + count, 0);
    
    const errorsTotal = Object.values(this.metricsData.errors)
      .reduce((sum, count) => sum + count, 0);
    
    const avgResponseTime = Object.values(this.metricsData.responseTimes)
      .reduce((sum, stats) => sum + stats.total, 0) / 
      Object.values(this.metricsData.responseTimes)
        .reduce((sum, stats) => sum + stats.count, 0) || 0;
    
    return {
      uptime,
      apiCallsTotal,
      errorsTotal,
      errorRate: apiCallsTotal > 0 ? errorsTotal / apiCallsTotal : 0,
      avgResponseTime: Math.round(avgResponseTime),
      detailed: this.metricsData
    };
  }
  
  /**
   * Generate monitoring report
   * @returns {Object} Report data
   */
  generateReport() {
    if (!this.enabled) {
      return {
        enabled: false,
        message: 'Monitoring is disabled'
      };
    }
    
    const metrics = this.getMetrics();
    
    logger.info('Generated monitoring report', {
      module: 'monitoring',
      uptime: metrics.uptime,
      apiCallsTotal: metrics.apiCallsTotal,
      errorsTotal: metrics.errorsTotal,
      errorRate: metrics.errorRate.toFixed(4),
      avgResponseTime: metrics.avgResponseTime
    });
    
    // Send report via notification service if available
    try {
      const notification = require('./notification');
      
      const reportHtml = `
        <h2>System Monitoring Report</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Uptime:</strong> ${Math.floor(metrics.uptime / (1000 * 60 * 60))} hours ${Math.floor((metrics.uptime % (1000 * 60 * 60)) / (1000 * 60))} minutes</p>
        
        <h3>Summary</h3>
        <ul>
          <li>Total API Calls: ${metrics.apiCallsTotal}</li>
          <li>Total Errors: ${metrics.errorsTotal}</li>
          <li>Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%</li>
          <li>Average Response Time: ${metrics.avgResponseTime}ms</li>
        </ul>
        
        <h3>Top API Endpoints</h3>
        <table border="1" cellpadding="5" style="border-collapse: collapse;">
          <tr>
            <th>Endpoint</th>
            <th>Calls</th>
            <th>Avg. Response Time</th>
          </tr>
          ${Object.entries(this.metricsData.apiCalls)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([endpoint, count]) => {
              const respTime = this.metricsData.responseTimes[endpoint.split(':')[1]];
              return `
                <tr>
                  <td>${endpoint}</td>
                  <td>${count}</td>
                  <td>${respTime ? Math.round(respTime.total / respTime.count) : 'N/A'}ms</td>
                </tr>
              `;
            }).join('')}
        </table>
        
        <h3>Errors</h3>
        <table border="1" cellpadding="5" style="border-collapse: collapse;">
          <tr>
            <th>Source</th>
            <th>Count</th>
          </tr>
          ${Object.entries(this.metricsData.errors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([source, count]) => `
              <tr>
                <td>${source}</td>
                <td>${count}</td>
              </tr>
            `).join('')}
        </table>
        
        <h3>Processing Jobs</h3>
        <table border="1" cellpadding="5" style="border-collapse: collapse;">
          <tr>
            <th>Job Type</th>
            <th>Started</th>
            <th>Completed</th>
            <th>Failed</th>
            <th>Avg. Duration</th>
          </tr>
          ${Object.entries(this.metricsData.processingJobs)
            .map(([jobType, stats]) => `
              <tr>
                <td>${jobType}</td>
                <td>${stats.started}</td>
                <td>${stats.completed}</td>
                <td>${stats.failed}</td>
                <td>${Math.round(stats.avgDuration)}ms</td>
              </tr>
            `).join('')}
        </table>
      `;
      
      notification.sendEmail('System Monitoring Report', reportHtml);
    } catch (error) {
      logger.error('Failed to send monitoring report', {
        module: 'monitoring',
        error: error.message
      });
    }
    
    return metrics;
  }
  
  /**
   * Persist metrics to storage
   * Currently just logs that persistence would happen
   */
  async persistMetrics() {
    if (!this.enabled || !this.persistenceEnabled) return;
    
    logger.info('Persisting metrics', {
      module: 'monitoring'
    });
    
    // In a real implementation, we would persist to a database or file
    // For now, just log
    logger.debug('Metrics persistence completed', {
      module: 'monitoring',
      metricsSnapshot: JSON.stringify(this.metricsData)
    });
  }
  
  /**
   * Reset metrics data
   */
  resetMetrics() {
    logger.info('Resetting metrics data', {
      module: 'monitoring'
    });
    
    this.metricsData = {
      apiCalls: {},
      errors: {},
      responseTimes: {},
      processingJobs: {}
    };
  }
  
  /**
   * Clean up resources when shutting down
   */
  shutdown() {
    if (this.persistInterval) {
      clearInterval(this.persistInterval);
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    // Persist metrics one last time
    if (this.enabled && this.persistenceEnabled) {
      this.persistMetrics();
    }
    
    logger.info('Monitoring service shutdown', {
      module: 'monitoring'
    });
  }
}

// Export singleton instance
module.exports = new MonitoringService();