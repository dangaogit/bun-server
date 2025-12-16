import type { ServiceRegistry, ServiceInstance } from '../service-registry/types';
import { LoadBalancerFactory } from './load-balancer';
import {
  CircuitBreaker,
  RateLimiter,
  RetryStrategyImpl,
  type CircuitBreakerOptions,
  type RateLimiterOptions,
  type RetryStrategy,
} from '../governance';
import {
  Tracer,
  SpanKind,
  SpanStatus,
  type TracingOptions,
  type TraceCollector,
} from '../tracing';
import {
  ServiceMetricsCollector,
  type MonitoringOptions,
} from '../monitoring';
import {
  ServiceCallError,
  type ServiceCallOptions,
  type ServiceCallResponse,
  type ServiceRequestInterceptor,
  type ServiceResponseInterceptor,
  type LoadBalancer,
} from './types';

/**
 * 服务调用客户端
 * 依赖 ServiceRegistry 抽象接口，不依赖具体实现
 */
export class ServiceClient {
  private readonly serviceRegistry: ServiceRegistry;
  private readonly requestInterceptors: ServiceRequestInterceptor[] = [];
  private readonly responseInterceptors: ServiceResponseInterceptor[] = [];
  private readonly loadBalancers: Map<string, LoadBalancer> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private readonly rateLimiters: Map<string, RateLimiter> = new Map();
  private defaultCircuitBreakerOptions?: CircuitBreakerOptions;
  private defaultRateLimiterOptions?: RateLimiterOptions;
  private defaultRetryStrategy?: RetryStrategy;
  private tracer?: Tracer;
  private metricsCollector?: ServiceMetricsCollector;

  public constructor(serviceRegistry: ServiceRegistry) {
    this.serviceRegistry = serviceRegistry;
  }

  /**
   * 设置默认熔断器配置
   */
  public setDefaultCircuitBreakerOptions(options: CircuitBreakerOptions): void {
    this.defaultCircuitBreakerOptions = options;
  }

  /**
   * 设置默认限流器配置
   */
  public setDefaultRateLimiterOptions(options: RateLimiterOptions): void {
    this.defaultRateLimiterOptions = options;
  }

  /**
   * 设置默认重试策略
   */
  public setDefaultRetryStrategy(strategy: RetryStrategy): void {
    this.defaultRetryStrategy = strategy;
  }

  /**
   * 设置追踪器
   */
  public setTracer(tracer: Tracer): void {
    this.tracer = tracer;
  }

  /**
   * 设置监控指标收集器
   */
  public setMetricsCollector(collector: ServiceMetricsCollector): void {
    this.metricsCollector = collector;
  }

  /**
   * 添加请求拦截器
   */
  public addRequestInterceptor(interceptor: ServiceRequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  public addResponseInterceptor(interceptor: ServiceResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 调用服务
   */
  public async call<T = unknown>(options: ServiceCallOptions): Promise<ServiceCallResponse<T>> {
    // 应用请求拦截器
    let finalOptions = options;
    for (const interceptor of this.requestInterceptors) {
      finalOptions = await Promise.resolve(interceptor.intercept(finalOptions));
    }

    // 限流检查
    if (finalOptions.enableRateLimit) {
      const rateLimitKey = finalOptions.rateLimitKey ?? finalOptions.serviceName;
      let rateLimiter = this.rateLimiters.get(rateLimitKey);
      if (!rateLimiter) {
        rateLimiter = new RateLimiter(this.defaultRateLimiterOptions);
        this.rateLimiters.set(rateLimitKey, rateLimiter);
      }

      const allowed = await rateLimiter.allow(rateLimitKey);
      if (!allowed) {
        throw new ServiceCallError(`Rate limit exceeded for service: ${finalOptions.serviceName}`);
      }
    }

    // 获取服务实例
    const instances = await this.serviceRegistry.getInstances(finalOptions.serviceName, {
      namespaceId: finalOptions.instanceOptions?.namespaceId,
      groupName: finalOptions.instanceOptions?.groupName,
      clusterName: finalOptions.instanceOptions?.clusterName,
      healthyOnly: finalOptions.instanceOptions?.healthyOnly ?? true,
    });

    if (instances.length === 0) {
      throw new ServiceCallError(`No instances found for service: ${finalOptions.serviceName}`);
    }

    // 获取或创建负载均衡器
    const strategy = finalOptions.loadBalanceStrategy ?? 'roundRobin';
    let loadBalancer = this.loadBalancers.get(strategy);
    if (!loadBalancer) {
      loadBalancer = LoadBalancerFactory.create(strategy);
      this.loadBalancers.set(strategy, loadBalancer);
    }

    // 选择服务实例
    const instance = loadBalancer.select(instances, finalOptions.consistentHashKey);
    if (!instance) {
      throw new ServiceCallError(`Failed to select instance for service: ${finalOptions.serviceName}`);
    }

    const startTime = Date.now();

    // 开始追踪（如果启用）
    const span = this.tracer?.startSpan(
      `${finalOptions.method} ${finalOptions.serviceName}${finalOptions.path}`,
      SpanKind.CLIENT,
    );

    if (span && this.tracer) {
      this.tracer.setSpanTags(span.context.spanId, {
        'service.name': finalOptions.serviceName,
        'service.instance': `${instance.ip}:${instance.port}`,
        'http.method': finalOptions.method,
        'http.path': finalOptions.path,
      });

      // 注入追踪上下文到请求头
      const traceHeaders = this.tracer.injectToHeaders(span.context);
      finalOptions.headers = {
        ...finalOptions.headers,
        ...traceHeaders,
      };
    }

    // 执行请求（带熔断器和重试）
    const executeRequest = async (): Promise<ServiceCallResponse<T>> => {
      const timeout = finalOptions.timeout ?? 5000;
      let success = false;
      let response: ServiceCallResponse<T>;
      let error: Error | undefined;

      try {
        response = await this.executeRequest<T>(instance, finalOptions, timeout);
        success = true;

        // 应用响应拦截器
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await Promise.resolve(interceptor.intercept(finalResponse));
        }

        return finalResponse;
      } catch (e) {
        error = e instanceof Error ? e : new Error(String(e));
        throw error;
      } finally {
        const latency = Date.now() - startTime;

        // 记录监控指标
        if (this.metricsCollector) {
          this.metricsCollector.recordCall(
            finalOptions.serviceName,
            `${instance.ip}:${instance.port}`,
            success,
            latency,
          );
        }

        // 结束追踪
        if (span && this.tracer) {
          this.tracer.endSpan(
            span.context.spanId,
            success ? SpanStatus.OK : SpanStatus.ERROR,
            error,
          );
        }
      }
    };

    // 如果启用熔断器
    if (finalOptions.enableCircuitBreaker) {
      const circuitBreakerKey = `${finalOptions.serviceName}:${instance.ip}:${instance.port}`;
      let circuitBreaker = this.circuitBreakers.get(circuitBreakerKey);
      if (!circuitBreaker) {
        circuitBreaker = new CircuitBreaker(this.defaultCircuitBreakerOptions);
        this.circuitBreakers.set(circuitBreakerKey, circuitBreaker);
      }

      return circuitBreaker.execute(
        executeRequest,
        finalOptions.fallback,
      ) as Promise<ServiceCallResponse<T>>;
    }

    // 如果启用重试策略
    if (this.defaultRetryStrategy || finalOptions.retryCount !== undefined) {
      const retryStrategy = this.defaultRetryStrategy ?? {
        maxRetries: finalOptions.retryCount ?? 0,
        retryDelay: finalOptions.retryDelay ?? 1000,
      };

      const retryImpl = new RetryStrategyImpl(retryStrategy);
      return retryImpl.execute(executeRequest);
    }

    // 普通执行
    return executeRequest();
  }

  /**
   * 流式调用服务（返回 ReadableStream）
   * @param options - 服务调用选项
   * @returns ReadableStream
   */
  public async callStream(options: ServiceCallOptions): Promise<ReadableStream> {
    // 应用请求拦截器
    let finalOptions = options;
    for (const interceptor of this.requestInterceptors) {
      finalOptions = await Promise.resolve(interceptor.intercept(finalOptions));
    }

    // 获取服务实例
    const instances = await this.serviceRegistry.getInstances(finalOptions.serviceName, {
      namespaceId: finalOptions.instanceOptions?.namespaceId,
      groupName: finalOptions.instanceOptions?.groupName,
      clusterName: finalOptions.instanceOptions?.clusterName,
      healthyOnly: finalOptions.instanceOptions?.healthyOnly ?? true,
    });

    if (instances.length === 0) {
      throw new ServiceCallError(`No instances found for service: ${finalOptions.serviceName}`);
    }

    // 获取或创建负载均衡器
    const strategy = finalOptions.loadBalanceStrategy ?? 'roundRobin';
    let loadBalancer = this.loadBalancers.get(strategy);
    if (!loadBalancer) {
      loadBalancer = LoadBalancerFactory.create(strategy);
      this.loadBalancers.set(strategy, loadBalancer);
    }

    // 选择服务实例
    const instance = loadBalancer.select(instances, finalOptions.consistentHashKey);
    if (!instance) {
      throw new ServiceCallError(`Failed to select instance for service: ${finalOptions.serviceName}`);
    }

    // 执行流式请求
    return this.executeStreamRequest(instance, finalOptions);
  }

  /**
   * 执行流式 HTTP 请求
   */
  private async executeStreamRequest(
    instance: ServiceInstance,
    options: ServiceCallOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    // 构建 URL
    const url = new URL(options.path, `http://${instance.ip}:${instance.port}`);

    // 添加查询参数
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.append(key, String(value));
      }
    }

    // 构建请求头
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
      ...options.headers,
    };

    // 构建请求体
    let body: string | undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        body = options.body;
      } else {
        body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
      }
    }

    // 执行请求
    const timeout = options.timeout ?? 30000; // 流式请求默认超时时间更长
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: options.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ServiceCallError(
          `Service call failed with status ${response.status}`,
          response.status,
          await response.text().catch(() => undefined),
          instance,
        );
      }

      if (!response.body) {
        throw new ServiceCallError('Response body is null', response.status, undefined, instance);
      }

      return response.body as ReadableStream<Uint8Array>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ServiceCallError) {
        throw error;
      }
      throw new ServiceCallError(
        `Service call failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        undefined,
        instance,
      );
    }
  }

  /**
   * 执行 HTTP 请求
   */
  private async executeRequest<T>(
    instance: ServiceInstance,
    options: ServiceCallOptions,
    timeout: number,
  ): Promise<ServiceCallResponse<T>> {
    // 构建 URL
    const url = new URL(options.path, `http://${instance.ip}:${instance.port}`);

    // 添加查询参数
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.append(key, String(value));
      }
    }

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 构建请求体
    let body: string | undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        body = options.body;
      } else {
        body = JSON.stringify(options.body);
      }
    }

    // 执行请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: options.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 读取响应头
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // 先检查响应状态，再读取响应体
      // 这样可以避免在错误响应时错误地解析响应体
      if (!response.ok) {
        // 对于错误响应，尝试读取错误信息（可能是 JSON 或文本）
        let errorData: unknown;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = await response.text();
          }
        } catch (parseError) {
          // 如果解析失败，使用状态文本作为错误信息
          errorData = response.statusText || 'Unknown error';
        }

        throw new ServiceCallError(
          `Service call failed with status ${response.status}`,
          response.status,
          errorData,
          instance,
        );
      }

      // 对于成功响应，根据 content-type 读取响应体
      const contentType = response.headers.get('content-type');
      let data: T;

      if (contentType?.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as T;
      }

      return {
        status: response.status,
        headers: responseHeaders,
        data,
        instance,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ServiceCallError) {
        throw error;
      }

      throw new ServiceCallError(
        `Service call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined,
        instance,
      );
    }
  }

  /**
   * 休眠（用于重试延迟）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

