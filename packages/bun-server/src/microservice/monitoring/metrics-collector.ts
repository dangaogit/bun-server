import type { ServiceCallMetrics, ServiceInstanceHealth, MonitoringOptions } from './types';
import { ServiceMetricsIntegration } from './metrics-integration';

/**
 * 请求记录
 */
interface RequestRecord {
  timestamp: number;
  success: boolean;
  latency: number;
}

/**
 * 服务监控指标收集器
 */
export class ServiceMetricsCollector {
  private readonly options: Required<MonitoringOptions>;
  private readonly metrics: Map<string, ServiceCallMetrics> = new Map();
  private readonly healthStatus: Map<string, ServiceInstanceHealth> = new Map();
  private readonly requestRecords: Map<string, RequestRecord[]> = new Map();
  private readonly maxRecordsPerInstance: number = 1000;
  private metricsIntegration?: ServiceMetricsIntegration;

  public constructor(options: MonitoringOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      collectionInterval: options.collectionInterval ?? 60000,
      autoReportToMetrics: options.autoReportToMetrics ?? true,
    };

    // 如果启用自动上报，创建集成器
    if (this.options.autoReportToMetrics) {
      this.metricsIntegration = new ServiceMetricsIntegration(this);
      // 延迟启动，确保 MetricsModule 已注册
      setTimeout(() => {
        this.metricsIntegration?.start(this.options.collectionInterval);
      }, 1000);
    }
  }

  /**
   * 记录服务调用
   */
  public recordCall(
    serviceName: string,
    instance: string,
    success: boolean,
    latency: number,
  ): void {
    if (!this.options.enabled) {
      return;
    }

    const key = this.getKey(serviceName, instance);

    // 记录请求
    const records = this.requestRecords.get(key) ?? [];
    records.push({
      timestamp: Date.now(),
      success,
      latency,
    });

    // 限制记录数量
    if (records.length > this.maxRecordsPerInstance) {
      records.shift();
    }
    this.requestRecords.set(key, records);

    // 更新指标
    this.updateMetrics(serviceName, instance);

    // 更新健康状态
    this.updateHealthStatus(serviceName, instance, success);
  }

  /**
   * 获取服务指标
   */
  public getMetrics(serviceName: string, instance?: string): ServiceCallMetrics[] {
    const result: ServiceCallMetrics[] = [];

    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.serviceName === serviceName && (!instance || metrics.instance === instance)) {
        result.push(metrics);
      }
    }

    return result;
  }

  /**
   * 获取所有指标
   */
  public getAllMetrics(): ServiceCallMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 获取服务实例健康状态
   */
  public getHealthStatus(serviceName: string, instance?: string): ServiceInstanceHealth[] {
    const result: ServiceInstanceHealth[] = [];

    for (const [key, health] of this.healthStatus.entries()) {
      if (health.serviceName === serviceName && (!instance || health.instance === instance)) {
        result.push(health);
      }
    }

    return result;
  }

  /**
   * 获取所有健康状态
   */
  public getAllHealthStatus(): ServiceInstanceHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * 更新指标
   */
  private updateMetrics(serviceName: string, instance: string): void {
    const key = this.getKey(serviceName, instance);
    const records = this.requestRecords.get(key) ?? [];

    if (records.length === 0) {
      return;
    }

    const totalRequests = records.length;
    const successRequests = records.filter((r) => r.success).length;
    const failureRequests = totalRequests - successRequests;
    const errorRate = totalRequests > 0 ? failureRequests / totalRequests : 0;

    const latencies = records.map((r) => r.latency);
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    const metrics: ServiceCallMetrics = {
      serviceName,
      instance,
      totalRequests,
      successRequests,
      failureRequests,
      averageLatency,
      minLatency,
      maxLatency,
      errorRate,
      lastUpdateTime: Date.now(),
    };

    this.metrics.set(key, metrics);
  }

  /**
   * 更新健康状态
   */
  private updateHealthStatus(serviceName: string, instance: string, success: boolean): void {
    const key = this.getKey(serviceName, instance);
    const now = Date.now();

    let health = this.healthStatus.get(key);
    if (!health) {
      health = {
        serviceName,
        instance,
        healthy: true,
        checkTime: now,
        consecutiveFailures: 0,
      };
    }

    if (success) {
      health.healthy = true;
      health.consecutiveFailures = 0;
      health.lastSuccessTime = now;
    } else {
      health.consecutiveFailures++;
      health.lastFailureTime = now;
      // 连续失败 3 次以上认为不健康
      if (health.consecutiveFailures >= 3) {
        health.healthy = false;
      }
    }

    health.checkTime = now;
    this.healthStatus.set(key, health);
  }

  /**
   * 生成键
   */
  private getKey(serviceName: string, instance: string): string {
    return `${serviceName}:${instance}`;
  }

  /**
   * 重置指标
   */
  public reset(serviceName?: string, instance?: string): void {
    if (serviceName && instance) {
      const key = this.getKey(serviceName, instance);
      this.metrics.delete(key);
      this.healthStatus.delete(key);
      this.requestRecords.delete(key);
    } else {
      this.metrics.clear();
      this.healthStatus.clear();
      this.requestRecords.clear();
    }
  }

  /**
   * 停止指标收集和上报
   */
  public stop(): void {
    this.metricsIntegration?.stop();
  }
}

