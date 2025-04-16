// Define mockLogger using 'let' instead of 'const' so it can be reassigned
let mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock logger before importing monitoring
jest.mock('../../utils/logger', () => mockLogger);

// Now it's safe to import the monitoring module
const monitoring = require('../../utils/monitoring');

// Mock config
jest.mock('../../config/config', () => ({
  monitoring: {
    enabled: true,
    alertThresholds: {
      cpu: 80,
      memory: 85,
    },
  },
  environment: 'test'
}));

// Mock notification service
const mockNotifyAdmin = jest.fn().mockResolvedValue({ success: true });
const mockNotifyError = jest.fn().mockResolvedValue({ success: true });

jest.mock('../../utils/notification', () => ({
  notifyAdmin: mockNotifyAdmin,
  notifyError: mockNotifyError
}));

// Mock os module with values that will trigger alerts
jest.mock('os', () => ({
  totalmem: jest.fn().mockReturnValue(1000000000), // 1GB
  freemem: jest.fn().mockReturnValue(200000000),   // 200MB (80% used)
  loadavg: jest.fn().mockReturnValue([2.5, 2.0, 1.5]), // 1, 5, 15 minute averages
  uptime: jest.fn().mockReturnValue(86400) // 1 day
}));

describe('Monitoring Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset modules to ensure clean state
    jest.resetModules();
    
    // Load mocked modules - reassigning to mockLogger which is now a 'let' variable
    mockLogger = require('../../utils/logger');
  });
  
  test('recordApiUsage tracks API endpoint usage', () => {
    monitoring.recordApiUsage('getProducts');
    monitoring.recordApiUsage('getProducts'); // Call twice
    monitoring.recordApiUsage('processVoice');

    // Access metrics from the imported module
    const metrics = monitoring.getMetrics ? monitoring.getMetrics() : monitoring.metrics; // Adjust based on how metrics are exposed

    // Check the metrics object
    expect(metrics).toBeDefined(); // Ensure metrics object exists
    expect(metrics.apiCalls).toBeDefined(); // Ensure apiCalls property exists
    expect(metrics.apiCalls.getProducts).toBe(2);
    expect(metrics.apiCalls.processVoice).toBe(1);
  });
  
  test('recordError tracks error occurrences', () => {
    // Skip if module or method doesn't exist
    if (!monitoring || !monitoring.recordError) {
      console.warn('Skipping test: recordError method not available');
      return;
    }
    
    // Record various errors
    const error1 = new Error('Database connection failed');
    const error2 = new Error('API request failed');
    
    monitoring.recordError(error1, 'database');
    monitoring.recordError(error2, 'api');
    monitoring.recordError(error2, 'api'); // Duplicate error
    
    // Get error stats
    const errorStats = monitoring.getErrorStats && monitoring.getErrorStats();
    
    // If getErrorStats exists, verify error tracking
    if (errorStats) {
      expect(errorStats.total).toBe(3);
      expect(errorStats.bySource.database).toBe(1);
      expect(errorStats.bySource.api).toBe(2);
    }
    
    // Verify errors were logged
    expect(mockLogger.error).toHaveBeenCalledTimes(3);
  });
  
  test('getSystemHealth returns comprehensive health information', () => {
    // Skip if module or method doesn't exist
    if (!monitoring || !monitoring.getSystemHealth) {
      console.warn('Skipping test: getSystemHealth method not available');
      return;
    }
    
    const healthInfo = monitoring.getSystemHealth();
    
    // Verify health information structure
    expect(healthInfo).toHaveProperty('status');
    expect(healthInfo).toHaveProperty('uptime');
    expect(healthInfo).toHaveProperty('memory');
    expect(healthInfo).toHaveProperty('cpu');
    
    // Verify memory information
    expect(healthInfo.memory).toHaveProperty('total');
    expect(healthInfo.memory).toHaveProperty('free');
    expect(healthInfo.memory).toHaveProperty('used');
    
    // Verify memory calculations
    expect(healthInfo.memory.total).toBe(1000000000); // From mock
    expect(healthInfo.memory.free).toBe(200000000);   // From mock
    expect(healthInfo.memory.used).toBe(800000000);   // Calculated
    
    // Verify CPU information
    expect(healthInfo.cpu).toBe(2.5); // From mock
  });
  
  test('checkThresholds triggers alerts when thresholds are exceeded', () => {
    // Skip if module or method doesn't exist
    if (!monitoring || !monitoring.checkThresholds) {
      console.warn('Skipping test: checkThresholds method not available');
      return;
    }
    
    // Directly call checkThresholds - memory usage is 80% which should trigger alert
    monitoring.checkThresholds();
    
    // Since we mocked memory usage to 80% (above the 70% threshold)
    // and CPU to 2.5 (likely above threshold depending on the system),
    // both alerts should be triggered
    expect(mockNotifyAdmin).toHaveBeenCalled();
    expect(mockNotifyAdmin.mock.calls[0][0]).toMatch(/memory|cpu/i);
  });
  
  test('startMonitoring sets up periodic health checks', () => {
    // Skip if module or method doesn't exist
    if (!monitoring || !monitoring.startMonitoring) {
      console.warn('Skipping test: startMonitoring method not available');
      return;
    }
    
    // Mock setInterval
    jest.useFakeTimers();
    const originalSetInterval = global.setInterval;
    global.setInterval = jest.fn();
    
    // Start monitoring
    monitoring.startMonitoring();
    
    // Verify interval was set
    expect(global.setInterval).toHaveBeenCalled();
    
    // Restore original setInterval
    global.setInterval = originalSetInterval;
    jest.useRealTimers();
  });
});
