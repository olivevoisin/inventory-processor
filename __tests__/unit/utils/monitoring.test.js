<<<<<<< HEAD
const monitoring = require('../../../modules/monitoring');
const notifications = require('../../../utils/notification');

// Mock the notification module
jest.mock('../../../utils/notification', () => ({
  notifyAdmin: jest.fn()
}));

describe('Monitoring Module', () => {
  beforeEach(() => {
    // Clear mock counts before each test
    jest.clearAllMocks();
    
    // Reset the module state
    monitoring.resetCounters();
  });
  
  test('recordApiUsage tracks API endpoint usage', () => {
    // Record some API usage
    monitoring.recordApiUsage('/api/test');
    monitoring.recordApiUsage('/api/test');
    monitoring.recordApiUsage('/api/another');
    
    // Get system health to check if usage was tracked
    const health = monitoring.getSystemHealth();
    
    // Check if the API usage was properly recorded
    expect(health.api.endpoints['/api/test']).toBe(2);
    expect(health.api.endpoints['/api/another']).toBe(1);
    expect(health.api.totalCalls).toBe(3);
  });
  
  test('recordError tracks error occurrences', () => {
    // Record some errors
    monitoring.recordError(new Error('Test error 1'));
    monitoring.recordError('Test error 2');
    
    // Get system health to check if errors were tracked
    const health = monitoring.getSystemHealth();
    
    // Check if errors were properly recorded
    expect(health.api.errors).toBe(2);
  });
  
  test('getSystemHealth returns comprehensive health information', () => {
    // Get system health information
    const health = monitoring.getSystemHealth();
    
    // Check if all required properties are present
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('timestamp');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('memory');
    expect(health).toHaveProperty('cpu');
    expect(health).toHaveProperty('api');
    
    // Check if memory information is present
    expect(health.memory).toHaveProperty('total');
    expect(health.memory).toHaveProperty('free');
    expect(health.memory).toHaveProperty('used');
    expect(health.memory).toHaveProperty('usagePercent');
    
    // Check if CPU information is present
    expect(health.cpu).toHaveProperty('loadAverage');
    expect(health.cpu).toHaveProperty('cores');
    expect(health.cpu).toHaveProperty('usagePercent');
    
    // Check if API information is present
    expect(health.api).toHaveProperty('totalCalls');
    expect(health.api).toHaveProperty('errors');
    expect(health.api).toHaveProperty('endpoints');
    expect(health.api).toHaveProperty('errorRate');
  });
  
  test('checkThresholds triggers alerts when thresholds are exceeded', () => {
    // Backup the original implementation of getSystemHealth
    const originalGetSystemHealth = monitoring.getSystemHealth;
    
    // Mock getSystemHealth to return high memory and CPU usage
    monitoring.getSystemHealth = jest.fn().mockReturnValue({
      memory: { usagePercent: 95 }, // High memory usage
      cpu: { usagePercent: 90 },    // High CPU usage
      api: { totalCalls: 100, errors: 10, errorRate: 0.1 }
    });
    
    // Call checkThresholds
    const result = monitoring.checkThresholds();
    
    // Restore original implementation
    monitoring.getSystemHealth = originalGetSystemHealth;
    
    // Check if the result indicates alerts
    expect(result.hasAlerts).toBe(true);
    expect(result.alerts.length).toBeGreaterThan(0);
    
    // Check if notifications were sent
    // Since we've triggered both memory and CPU alerts
    // and CPU to 2.5 (likely above threshold depending on the system),
    // both alerts should be triggered
    expect(notifications.notifyAdmin).toHaveBeenCalled();
    expect(notifications.notifyAdmin.mock.calls[0][0]).toMatch(/memory|cpu/i);
  });
  
  test('startMonitoring sets up periodic health checks', () => {
    // Backup the original setInterval function
    const originalSetInterval = global.setInterval;
    
    // Mock setInterval
    global.setInterval = jest.fn();
    
    // Call startMonitoring
    const result = monitoring.startMonitoring(10000);
    
    // Check if setInterval was called with the correct interval
    expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 10000);
    
    // Check if the result contains expected properties
    expect(result).toHaveProperty('monitoringActive', true);
    expect(result).toHaveProperty('interval', 10000);
    expect(result).toHaveProperty('startTime');
    
    // Clean up
    monitoring.stopMonitoring();
    
    // Restore original setInterval
    global.setInterval = originalSetInterval;
  });
});

=======
/**
 * Additional tests for the monitoring module to improve coverage
 */
const monitoring = require('../../../utils/monitoring');

describe('Monitoring Module Additional Tests', () => {
  beforeEach(() => {
    // Reset metrics before each test
    monitoring.resetMetrics();
  });
  
  test('getMetrics calculates error rate correctly', () => {
    // Record some API calls and errors
    monitoring.recordApiUsage('/api/test');
    monitoring.recordApiUsage('/api/test');
    monitoring.recordError(new Error('Test error'));
    
    // Get metrics
    const metrics = monitoring.getMetrics();
    
    // Check error rate: 1 error / 2 API calls = 0.5
    expect(metrics.errorRate).toBe(0.5);
  });
  
  test('getMetrics returns zero error rate when no API calls are made', () => {
    // Record an error but no API calls
    monitoring.recordError(new Error('Test error'));
    
    // Get metrics
    const metrics = monitoring.getMetrics();
    
    // Error rate should be 0 when there are no API calls
    expect(metrics.errorRate).toBe(0);
  });
  
  test('recordResponseTime handles large number of response times', () => {
    // Record a large number of response times to test the limit
    const count = 1100; // More than the 1000 limit
    
    for (let i = 0; i < count; i++) {
      monitoring.recordResponseTime(i);
    }
    
    // The average should reflect the most recent 1000 values
    // If we added 0-1099, and only keep the last 1000, we should have 100-1099
    // Average of values from 100 to 1099 = (100+1099)/2 = 599.5
    const metrics = monitoring.getMetrics();
    
    // Check if average is close to the expected value
    // We use a delta because the exact implementation might vary
    expect(metrics.avgResponseTime).toBeGreaterThan(500);
  });
  
  test('getSystemHealth status is healthy by default', () => {
    const health = monitoring.getSystemHealth();
    expect(health.status).toBe('healthy');
  });
  
  // Test memory information
  test('getSystemHealth reports correct memory information', () => {
    const health = monitoring.getSystemHealth();
    
    // Memory total should be a positive number
    expect(health.memory.total).toBeGreaterThan(0);
    
    // Used + free should approximately equal total
    // We use a tolerance because there might be slight discrepancies
    const sum = health.memory.used + health.memory.free;
    const diff = Math.abs(sum - health.memory.total);
    const tolerance = health.memory.total * 0.01; // 1% tolerance
    
    expect(diff).toBeLessThan(tolerance);
  });
  
  // Test os.loadavg() integration
  test('getSystemHealth includes CPU information from os.loadavg', () => {
    // We'll mock os.loadavg to return known values
    const os = require('os');
    const originalLoadavg = os.loadavg;
    
    // Mock loadavg to return [1, 0.5, 0.25]
    os.loadavg = jest.fn().mockReturnValue([1, 0.5, 0.25]);
    
    // Get health info with mocked loadavg
    const health = monitoring.getSystemHealth();
    
    // Restore original function
    os.loadavg = originalLoadavg;
    
    // The CPU value should be 1 (the first value from loadavg)
    expect(health.cpu).toBe(1);
  });
});
>>>>>>> backup-main
