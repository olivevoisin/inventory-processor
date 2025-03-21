/**
 * Enhanced structured logging utility for inventory management application
 */

const winston = require('winston');
const { format } = winston;
const config = require('../config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  return config.environment === 'development' ? 'debug' : 'info';
};

// Define custom format for logs
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Define transports for Winston
const transports = [
  // Console transport for all logs
  new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(({ timestamp, level, message, ...meta }) => {
        // Extract request ID and other key info for cleaner logs
        const requestId = meta.requestId ? `[${meta.requestId}] ` : '';
        const duration = meta.duration ? `(${meta.duration}ms) ` : '';
        const service = meta.service ? `[${meta.service}] ` : '';
        
        // Format standard log line
        let logLine = `${timestamp} ${level}: ${requestId}${service}${duration}${message}`;
        
        // Add metadata if present but remove common fields to avoid duplication
        const { requestId: _, duration: __, service: ___, timestamp: ____, level: _____, ...restMeta } = meta;
        
        if (Object.keys(restMeta).length > 0) {
          logLine += ` ${JSON.stringify(restMeta)}`;
        }
        
        return logLine;
      })
    ),
  }),
  
  // File transport for errors only
  new winston.transports.File({ 
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }),
  
  // File transport for all logs
  new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
  }),
];

// Initialize logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: customFormat,
  transports,
  defaultMeta: { service: 'inventory-app' },
  exitOnError: false, // Don't crash on exception
});

// Add performance tracking methods
logger.startTimer = () => {
  return {
    start: process.hrtime(),
    end: (meta = {}) => {
      const diff = process.hrtime(meta.start || this.start);
      const duration = (diff[0] * 1e3) + (diff[1] * 1e-6); // Convert to milliseconds
      return Math.round(duration);
    }
  };
};

// Add request logging middleware
logger.requestMiddleware = (req, res, next) => {
  // Generate unique request ID if not already present
  req.requestId = req.headers['x-request-id'] || 
                  req.id || 
                  `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Add request ID to response headers
  res.setHeader('x-request-id', req.requestId);
  
  // Start timer for request duration
  const timer = logger.startTimer();
  
  // Log request
  logger.http(`${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get('user-agent') || 'unknown'
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = timer.end();
    const level = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      requestId: req.requestId,
      duration,
      statusCode: res.statusCode,
      contentLength: res.get('content-length') || 0
    });
  });
  
  next();
};

// Production error handling
if (config.environment === 'production') {
  // Add additional production transports like Google Cloud Logging if needed
  if (config.googleCloud && config.googleCloud.enabled) {
    const { LoggingWinston } = require('@google-cloud/logging-winston');
    logger.add(new LoggingWinston({
      projectId: config.googleCloud.projectId,
      keyFilename: config.googleCloud.keyFilename,
      logName: 'inventory_app_logs'
    }));
  }
}

module.exports = logger;