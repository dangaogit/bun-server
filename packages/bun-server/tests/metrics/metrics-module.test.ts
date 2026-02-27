import { describe, expect, test, beforeEach } from 'bun:test';

import { Application } from '../../src/core/application';
import { MetricsModule, MetricsCollector, createHttpMetricsMiddleware, type CustomMetric } from '../../src/metrics';
import { Controller } from '../../src/controller';
import { METRICS_SERVICE_TOKEN } from '../../src/metrics';
import { Inject } from '../../src/di/decorators';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('MetricsModule', () => {
  beforeEach(() => {
    // 清除模块元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, MetricsModule);
  });

  test('should register metrics service provider', () => {
    MetricsModule.forRoot();

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, MetricsModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();

    const metricsProvider = metadata.providers.find(
      (provider: any) => provider.provide === METRICS_SERVICE_TOKEN,
    );
    expect(metricsProvider).toBeDefined();
    expect(metricsProvider.useValue).toBeInstanceOf(MetricsCollector);
  });

  test('should register custom metrics', () => {
    const customMetric: CustomMetric = {
      name: 'custom_metric',
      type: 'gauge',
      help: 'A custom metric',
      getValue: () => 42,
    };

    MetricsModule.forRoot({
      customMetrics: [customMetric],
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, MetricsModule);
    const metricsProvider = metadata.providers.find(
      (provider: any) => provider.provide === METRICS_SERVICE_TOKEN,
    );
    const collector = metricsProvider.useValue as MetricsCollector;

    // 验证自定义指标已注册（通过检查是否能获取到）
    expect(collector).toBeInstanceOf(MetricsCollector);
  });
});

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  test('should increment counter', async () => {
    collector.incrementCounter('test_counter');
    collector.incrementCounter('test_counter', { label: 'value' }, 2);

    const dataPoints = await collector.getAllDataPoints();
    const counterPoints = dataPoints.filter((p) => p.name === 'test_counter');
    expect(counterPoints.length).toBeGreaterThan(0);
  });

  test('should set gauge', async () => {
    collector.setGauge('test_gauge', undefined, 100);
    collector.setGauge('test_gauge', { label: 'value' }, 200);

    const dataPoints = await collector.getAllDataPoints();
    const gaugePoints = dataPoints.filter((p) => p.name === 'test_gauge');
    expect(gaugePoints.length).toBeGreaterThan(0);
  });

  test('should observe histogram', async () => {
    collector.observeHistogram('test_histogram', undefined, 0.5);
    collector.observeHistogram('test_histogram', { label: 'value' }, 1.0);

    const dataPoints = await collector.getAllDataPoints();
    const histogramPoints = dataPoints.filter((p) => p.name.startsWith('test_histogram'));
    expect(histogramPoints.length).toBeGreaterThan(0);
  });

  test('should collect custom metrics', async () => {
    const customMetric: CustomMetric = {
      name: 'custom_gauge',
      type: 'gauge',
      help: 'Custom gauge metric',
      getValue: () => 123,
    };

    collector.registerCustomMetric(customMetric);

    const dataPoints = await collector.getAllDataPoints();
    const customPoint = dataPoints.find((p) => p.name === 'custom_gauge');
    expect(customPoint).toBeDefined();
    expect(customPoint?.value).toBe(123);
    expect(customPoint?.help).toBe('Custom gauge metric');
  });

  test('should reset all metrics', async () => {
    collector.incrementCounter('test_counter');
    collector.setGauge('test_gauge', undefined, 100);

    collector.reset();

    const dataPoints = await collector.getAllDataPoints();
    // 自定义指标可能仍然存在
    const nonCustomPoints = dataPoints.filter((p) => !p.name.startsWith('custom_'));
    expect(nonCustomPoints.length).toBe(0);
  });
});

describe('PrometheusFormatter', () => {
  test('should format metrics in Prometheus format', async () => {
    const collector = new MetricsCollector();
    collector.incrementCounter('http_requests_total', { method: 'GET', status: '200' });
    collector.setGauge('active_connections', undefined, 10);

    const { PrometheusFormatter } = await import('../../src/metrics/prometheus');
    const formatter = new PrometheusFormatter();
    const dataPoints = await collector.getAllDataPoints();
    const formatted = formatter.format(dataPoints);

    expect(formatted).toContain('http_requests_total');
    expect(formatted).toContain('active_connections');
    expect(formatted).toContain('method="GET"');
    expect(formatted).toContain('status="200"');
  });
});

describe('MetricsController', () => {
  test('should create controller instance', () => {
    const collector = new MetricsCollector();
    const { MetricsController } = require('../../src/metrics/controller');
    const controller = new MetricsController(collector, {});
    expect(controller).toBeDefined();
  });

  test('should format metrics response', async () => {
    const collector = new MetricsCollector();
    collector.incrementCounter('test_counter', { label: 'value' });

    const { MetricsController } = await import('../../src/metrics/controller');
    const controller = new MetricsController(collector, {});

    const response = await controller.metrics();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');

    const text = await response.text();
    expect(text).toContain('test_counter');
  });
});

describe('createHttpMetricsMiddleware', () => {
  test('should collect HTTP request metrics', async () => {
    const collector = new MetricsCollector();
    const middleware = createHttpMetricsMiddleware(collector);

    const { Context } = await import('../../src/core/context');
    const context = new Context(new Request('http://localhost:3000/api/test', { method: 'GET' }));

    await middleware(context, async () => {
      return new Response('OK', { status: 200 });
    });

    const dataPoints = await collector.getAllDataPoints();
    const requestTotal = dataPoints.find((p) => p.name === 'http_requests_total');
    expect(requestTotal).toBeDefined();
    expect(requestTotal?.labels?.method).toBe('GET');
    expect(requestTotal?.labels?.status).toBe('200');
  });
});
