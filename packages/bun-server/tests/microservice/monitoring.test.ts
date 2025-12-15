import { describe, expect, test, beforeEach } from 'bun:test';
import { ServiceMetricsCollector } from '../../src/microservice/monitoring/metrics-collector';

describe('ServiceMetricsCollector', () => {
  let collector: ServiceMetricsCollector;

  beforeEach(() => {
    collector = new ServiceMetricsCollector({
      enabled: true,
      autoReportToMetrics: false, // 测试时不自动上报
    });
  });

  test('should create metrics collector', () => {
    expect(collector).toBeDefined();
  });

  test('should record service call', () => {
    collector.recordCall('test-service', '127.0.0.1:3000', true, 100);

    const metrics = collector.getMetrics('test-service');
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0]?.totalRequests).toBe(1);
    expect(metrics[0]?.successRequests).toBe(1);
  });

  test('should calculate error rate', () => {
    // 记录 10 次调用，5 次成功，5 次失败
    for (let i = 0; i < 5; i++) {
      collector.recordCall('test-service', '127.0.0.1:3000', true, 100);
    }
    for (let i = 0; i < 5; i++) {
      collector.recordCall('test-service', '127.0.0.1:3000', false, 200);
    }

    const metrics = collector.getMetrics('test-service');
    expect(metrics[0]?.errorRate).toBe(0.5);
    expect(metrics[0]?.totalRequests).toBe(10);
    expect(metrics[0]?.successRequests).toBe(5);
    expect(metrics[0]?.failureRequests).toBe(5);
  });

  test('should track health status', () => {
    // 记录多次失败
    for (let i = 0; i < 3; i++) {
      collector.recordCall('test-service', '127.0.0.1:3000', false, 500);
    }

    const healthStatus = collector.getHealthStatus('test-service');
    expect(healthStatus.length).toBeGreaterThan(0);
    expect(healthStatus[0]?.healthy).toBe(false);
    expect(healthStatus[0]?.consecutiveFailures).toBeGreaterThanOrEqual(3);
  });

  test('should reset metrics', () => {
    collector.recordCall('test-service', '127.0.0.1:3000', true, 100);
    collector.reset('test-service', '127.0.0.1:3000');

    const metrics = collector.getMetrics('test-service');
    expect(metrics.length).toBe(0);
  });

  test('should calculate latency statistics', () => {
    const latencies = [50, 100, 150, 200, 250];
    for (const latency of latencies) {
      collector.recordCall('test-service', '127.0.0.1:3000', true, latency);
    }

    const metrics = collector.getMetrics('test-service');
    expect(metrics[0]?.averageLatency).toBe(150);
    expect(metrics[0]?.minLatency).toBe(50);
    expect(metrics[0]?.maxLatency).toBe(250);
  });
});

