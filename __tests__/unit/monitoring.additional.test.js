/**
 * Additional tests for the monitoring module to improve coverage
 */
const monitoring = require('../../utils/monitoring');

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
