import { MetricsCollector, METRICS_SERVICE_TOKEN } from '../../metrics';
import { ControllerRegistry } from '../../controller/controller';
import { ServiceMetricsCollector } from './metrics-collector';
import type { ServiceCallMetrics, ServiceInstanceHealth } from './types';

/**
 * 服务监控指标集成器
 * 将 ServiceMetricsCollector 的指标自动上报到 MetricsModule
 */
export class ServiceMetricsIntegration {
  private metricsCollector?: MetricsCollector;
  private serviceMetricsCollector: ServiceMetricsCollector;
  private updateInterval?: ReturnType<typeof setInterval>;

  public constructor(serviceMetricsCollector: ServiceMetricsCollector) {
    this.serviceMetricsCollector = serviceMetricsCollector;
  }

  /**
   * 启动指标上报
   */
  public start(intervalMs: number = 60000): void {
    // 获取 MetricsCollector
    try {
      const container = ControllerRegistry.getInstance().getContainer();
      this.metricsCollector = container.resolve<MetricsCollector>(
        METRICS_SERVICE_TOKEN,
      );
    } catch (error) {
      console.warn(
        '[ServiceMetricsIntegration] MetricsCollector not found, skipping integration',
      );
      return;
    }

    if (!this.metricsCollector) {
      return;
    }

    // 立即上报一次
    this.reportMetrics();

    // 定期上报
    this.updateInterval = setInterval(() => {
      this.reportMetrics();
    }, intervalMs);
  }

  /**
   * 停止指标上报
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * 上报指标到 MetricsCollector
   */
  private reportMetrics(): void {
    if (!this.metricsCollector) {
      return;
    }

    try {
      const allMetrics = this.serviceMetricsCollector.getAllMetrics();
      const allHealthStatus = this.serviceMetricsCollector.getAllHealthStatus();

      // 上报服务调用指标
      for (const metrics of allMetrics) {
        const labels = {
          service: metrics.serviceName,
          instance: metrics.instance,
        };

        // 总请求数（counter）
        this.metricsCollector.incrementCounter(
          'service_calls_total',
          labels,
          metrics.totalRequests,
        );

        // 成功请求数（counter）
        this.metricsCollector.incrementCounter(
          'service_calls_success_total',
          labels,
          metrics.successRequests,
        );

        // 失败请求数（counter）
        this.metricsCollector.incrementCounter(
          'service_calls_failure_total',
          labels,
          metrics.failureRequests,
        );

        // 平均延迟（gauge）
        this.metricsCollector.setGauge(
          'service_call_latency_avg_ms',
          labels,
          metrics.averageLatency,
        );

        // 最小延迟（gauge）
        this.metricsCollector.setGauge(
          'service_call_latency_min_ms',
          labels,
          metrics.minLatency,
        );

        // 最大延迟（gauge）
        this.metricsCollector.setGauge(
          'service_call_latency_max_ms',
          labels,
          metrics.maxLatency,
        );

        // 错误率（gauge）
        this.metricsCollector.setGauge(
          'service_call_error_rate',
          labels,
          metrics.errorRate,
        );
      }

      // 上报健康状态指标
      for (const health of allHealthStatus) {
        const labels = {
          service: health.serviceName,
          instance: health.instance,
        };

        // 健康状态（gauge: 1=健康, 0=不健康）
        this.metricsCollector.setGauge(
          'service_instance_healthy',
          labels,
          health.healthy ? 1 : 0,
        );

        // 连续失败次数（gauge）
        this.metricsCollector.setGauge(
          'service_instance_consecutive_failures',
          labels,
          health.consecutiveFailures,
        );
      }
    } catch (error) {
      console.error('[ServiceMetricsIntegration] Failed to report metrics:', error);
    }
  }
}

