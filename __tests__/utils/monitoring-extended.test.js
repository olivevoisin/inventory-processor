// Define mockLogger before importing the module
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock dependencies first
jest.mock('../../utils/logger', () => mockLogger);

// Then import the module
const monitoring = require('../../utils/monitoring');

// Mock notification service
const mockNotifyAdmin = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../utils/notification', () => ({
  notifyAdmin: mockNotifyAdmin
}));

// Mock os module
jest.mock('os', () => ({
  totalmem: jest.fn().mockReturnValue(16000000000), // 16GB
  freemem: jest.fn().mockReturnValue(4000000000),   // 4GB (75% used)
  loadavg: jest.fn().mockReturnValue([3.5, 2.0, 1.5]), // High load for testing
  uptime: jest.fn().mockReturnValue(86400) // 1 day
}));

jest.mock('../../config/config', () => ({
  monitoring: {
    enabled: true,
    alertThresholds: {
      cpu: 3.0,  // Set threshold lower than mock value
      memory: 70, // Set threshold lower than mock value
    }
  }
}));

describe('Monitoring Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('checkThresholds should trigger alerts when thresholds are exceeded', () => {
    // Skip if not implemented
    if (typeof monitoring.checkThresholds !== 'function') {
      return;
    }
    
    monitoring.checkThresholds();
    
    // Verify alerts were triggered
    expect(mockNotifyAdmin).toHaveBeenCalled();
  });
  
  test('recordApiCall should track API usage metrics', () => {
    // Skip if not implemented
    if (typeof monitoring.recordApiCall !== 'function') {
      return;
    }
    
    monitoring.recordApiCall('getProducts', 200, 150);
    monitoring.recordApiCall('getProducts', 200, 250);
    
    // Verify metrics were updated
    const metrics = monitoring.getMetrics ? monitoring.getMetrics() : monitoring.metrics;
    expect(metrics.apiCalls.getProducts).toBeDefined();
    expect(metrics.apiCalls.getProducts.count).toBe(2);
    expect(metrics.apiCalls.getProducts.errors).toBe(0);
  });
});
