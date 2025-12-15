import type { ServiceInstance } from '../service-registry/types';

/**
 * 负载均衡策略类型
 */
export type LoadBalanceStrategy = 'random' | 'roundRobin' | 'weightedRoundRobin' | 'consistentHash' | 'leastActive';

/**
 * 负载均衡器接口
 */
export interface LoadBalancer {
  /**
   * 选择服务实例
   * @param instances - 服务实例列表
   * @param key - 用于一致性哈希的键（可选）
   * @returns 选中的服务实例
   */
  select(instances: ServiceInstance[], key?: string): ServiceInstance | null;
}

/**
 * 服务调用选项
 */
export interface ServiceCallOptions {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * HTTP 方法
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /**
   * 请求路径
   */
  path: string;

  /**
   * 请求头（可选）
   */
  headers?: Record<string, string>;

  /**
   * 请求体（可选）
   */
  body?: string | object;

  /**
   * 查询参数（可选）
   */
  query?: Record<string, string | number | boolean>;

  /**
   * 超时时间（毫秒）
   * @default 5000
   */
  timeout?: number;

  /**
   * 重试次数
   * @default 0
   */
  retryCount?: number;

  /**
   * 重试延迟（毫秒）
   * @default 1000
   */
  retryDelay?: number;

  /**
   * 负载均衡策略
   * @default 'roundRobin'
   */
  loadBalanceStrategy?: LoadBalanceStrategy;

  /**
   * 用于一致性哈希的键（可选）
   */
  consistentHashKey?: string;

  /**
   * 服务实例查询选项（可选）
   */
  instanceOptions?: {
    namespaceId?: string;
    groupName?: string;
    clusterName?: string;
    healthyOnly?: boolean;
  };

  /**
   * 是否启用熔断器（可选）
   * @default false
   */
  enableCircuitBreaker?: boolean;

  /**
   * 熔断器降级处理函数（可选）
   */
  fallback?: () => Promise<unknown> | unknown;

  /**
   * 是否启用限流（可选）
   * @default false
   */
  enableRateLimit?: boolean;

  /**
   * 限流键（可选，默认使用服务名）
   */
  rateLimitKey?: string;

  /**
   * 是否流式响应（用于 Server-Sent Events 等）
   * @default false
   */
  stream?: boolean;
}

/**
 * 服务调用响应
 */
export interface ServiceCallResponse<T = unknown> {
  /**
   * HTTP 状态码
   */
  status: number;

  /**
   * 响应头
   */
  headers: Record<string, string>;

  /**
   * 响应体
   */
  data: T;

  /**
   * 使用的服务实例
   */
  instance: ServiceInstance;
}

/**
 * 服务请求拦截器接口
 */
export interface ServiceRequestInterceptor {
  /**
   * 拦截请求
   * @param options - 服务调用选项
   * @returns 修改后的选项或 Promise
   */
  intercept(options: ServiceCallOptions): ServiceCallOptions | Promise<ServiceCallOptions>;
}

/**
 * 服务响应拦截器接口
 */
export interface ServiceResponseInterceptor {
  /**
   * 拦截响应
   * @param response - 服务调用响应
   * @returns 修改后的响应或 Promise
   */
  intercept<T>(response: ServiceCallResponse<T>): ServiceCallResponse<T> | Promise<ServiceCallResponse<T>>;
}

/**
 * 服务调用错误
 */
export class ServiceCallError extends Error {
  public constructor(
    message: string,
    public readonly status?: number,
    public readonly response?: unknown,
    public readonly instance?: ServiceInstance,
  ) {
    super(message);
    this.name = 'ServiceCallError';
  }
}

