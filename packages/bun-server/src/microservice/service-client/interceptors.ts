import type {
  ServiceCallOptions,
  ServiceCallResponse,
  ServiceRequestInterceptor,
  ServiceResponseInterceptor,
} from './types';

/**
 * 追踪 ID 请求拦截器
 * 自动在请求头中添加追踪 ID
 */
export class TraceIdRequestInterceptor implements ServiceRequestInterceptor {
  private readonly headerName: string;
  private readonly traceIdGenerator: () => string;

  public constructor(options?: {
    /**
     * 追踪 ID 请求头名称
     * @default 'X-Trace-Id'
     */
    headerName?: string;

    /**
     * 追踪 ID 生成器
     * @default 生成 UUID v4
     */
    traceIdGenerator?: () => string;
  }) {
    this.headerName = options?.headerName ?? 'X-Trace-Id';
    this.traceIdGenerator = options?.traceIdGenerator ?? this.generateTraceId;
  }

  public intercept(options: ServiceCallOptions): ServiceCallOptions {
    const traceId = this.traceIdGenerator();
    return {
      ...options,
      headers: {
        ...options.headers,
        [this.headerName]: traceId,
      },
    };
  }

  /**
   * 生成追踪 ID（UUID v4 简化版）
   */
  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * 用户信息请求拦截器
 * 自动在请求头中添加用户信息
 */
export class UserInfoRequestInterceptor implements ServiceRequestInterceptor {
  private readonly headerName: string;
  private readonly userInfoProvider: () => string | undefined;

  public constructor(options: {
    /**
     * 用户信息请求头名称
     * @default 'X-User-Info'
     */
    headerName?: string;

    /**
     * 用户信息提供者
     */
    userInfoProvider: () => string | undefined;
  }) {
    this.headerName = options.headerName ?? 'X-User-Info';
    this.userInfoProvider = options.userInfoProvider;
  }

  public intercept(options: ServiceCallOptions): ServiceCallOptions {
    const userInfo = this.userInfoProvider();
    if (!userInfo) {
      return options;
    }

    return {
      ...options,
      headers: {
        ...options.headers,
        [this.headerName]: userInfo,
      },
    };
  }
}

/**
 * 请求日志拦截器
 * 记录请求日志
 */
export class RequestLogInterceptor implements ServiceRequestInterceptor {
  private readonly logger?: (message: string) => void;

  public constructor(options?: {
    /**
     * 日志记录器
     */
    logger?: (message: string) => void;
  }) {
    this.logger = options?.logger ?? console.log;
  }

  public intercept(options: ServiceCallOptions): ServiceCallOptions {
    if (this.logger) {
      this.logger(
        `[ServiceClient] Request: ${options.method} ${options.serviceName}${options.path}`,
      );
    }
    return options;
  }
}

/**
 * 响应日志拦截器
 * 记录响应日志
 */
export class ResponseLogInterceptor implements ServiceResponseInterceptor {
  private readonly logger?: (message: string) => void;

  public constructor(options?: {
    /**
     * 日志记录器
     */
    logger?: (message: string) => void;
  }) {
    this.logger = options?.logger ?? console.log;
  }

  public intercept<T>(response: ServiceCallResponse<T>): ServiceCallResponse<T> {
    if (this.logger) {
      this.logger(
        `[ServiceClient] Response: ${response.status} from ${response.instance.ip}:${response.instance.port}`,
      );
    }
    return response;
  }
}

/**
 * 响应数据转换拦截器
 * 转换响应数据格式
 * 
 * 注意：这个拦截器会改变响应数据的类型，因此需要类型断言
 */
export class ResponseTransformInterceptor<TInput = unknown, TOutput = unknown> {
  private readonly transformer: (data: TInput) => TOutput;

  public constructor(transformer: (data: TInput) => TOutput) {
    this.transformer = transformer;
  }

  /**
   * 拦截响应并转换数据
   */
  public intercept<T>(response: ServiceCallResponse<T>): ServiceCallResponse<TOutput> {
    return {
      ...response,
      data: this.transformer(response.data as unknown as TInput),
    } as ServiceCallResponse<TOutput>;
  }
}

/**
 * 错误处理拦截器
 * 统一处理错误响应
 */
export class ErrorHandlerInterceptor implements ServiceResponseInterceptor {
  public intercept<T>(response: ServiceCallResponse<T>): ServiceCallResponse<T> {
    // 如果状态码表示错误，可以在这里进行统一处理
    // 例如：记录错误日志、转换错误格式等
    if (response.status >= 400) {
      // 可以在这里添加错误处理逻辑
    }
    return response;
  }
}

