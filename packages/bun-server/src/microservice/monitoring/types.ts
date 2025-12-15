/**
 * 服务调用指标
 */
export interface ServiceCallMetrics {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * 实例标识（IP:Port）
   */
  instance: string;

  /**
   * 总请求数
   */
  totalRequests: number;

  /**
   * 成功请求数
   */
  successRequests: number;

  /**
   * 失败请求数
   */
  failureRequests: number;

  /**
   * 平均延迟（毫秒）
   */
  averageLatency: number;

  /**
   * 最小延迟（毫秒）
   */
  minLatency: number;

  /**
   * 最大延迟（毫秒）
   */
  maxLatency: number;

  /**
   * 错误率（0-1）
   */
  errorRate: number;

  /**
   * 最后更新时间（时间戳）
   */
  lastUpdateTime: number;
}

/**
 * 服务实例健康状态
 */
export interface ServiceInstanceHealth {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * 实例标识（IP:Port）
   */
  instance: string;

  /**
   * 是否健康
   */
  healthy: boolean;

  /**
   * 健康检查时间（时间戳）
   */
  checkTime: number;

  /**
   * 连续失败次数
   */
  consecutiveFailures: number;

  /**
   * 最后成功时间（时间戳）
   */
  lastSuccessTime?: number;

  /**
   * 最后失败时间（时间戳）
   */
  lastFailureTime?: number;
}

/**
 * 监控配置选项
 */
export interface MonitoringOptions {
  /**
   * 是否启用监控
   * @default true
   */
  enabled?: boolean;

  /**
   * 指标收集间隔（毫秒）
   * @default 60000
   */
  collectionInterval?: number;

  /**
   * 是否自动上报到 MetricsModule
   * @default true
   */
  autoReportToMetrics?: boolean;
}

