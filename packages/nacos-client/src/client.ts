import type { NacosClientOptions } from './types';

/**
 * Nacos 客户端错误
 */
export class NacosClientError extends Error {
  public override readonly cause?: Error;

  public constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NacosClientError';
    this.cause = cause;
  }
}

/**
 * Nacos HTTP 客户端
 * 封装 Nacos 3.X Open API 的 HTTP 请求
 */
export class NacosClient {
  private readonly serverList: string[];
  private readonly namespaceId?: string;
  private readonly username?: string;
  private readonly password?: string;
  private readonly timeout: number;
  private readonly retryCount: number;
  private readonly retryDelay: number;
  private currentServerIndex: number = 0;

  public constructor(options: NacosClientOptions) {
    if (!options.serverList || options.serverList.length === 0) {
      throw new NacosClientError('serverList is required');
    }

    this.serverList = options.serverList;
    this.namespaceId = options.namespaceId;
    this.username = options.username;
    this.password = options.password;
    this.timeout = options.timeout ?? 5000;
    this.retryCount = options.retryCount ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
  }

  /**
   * 获取当前服务器地址
   */
  private getCurrentServer(): string {
    const server = this.serverList[this.currentServerIndex];
    if (!server) {
      throw new NacosClientError('No server available');
    }
    return server;
  }

  /**
   * 切换到下一个服务器（故障转移）
   */
  private switchToNextServer(): void {
    this.currentServerIndex = (this.currentServerIndex + 1) % this.serverList.length;
  }

  /**
   * 构建请求 URL
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const server = this.getCurrentServer();
    const url = new URL(path, server);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.username && this.password) {
      const auth = btoa(`${this.username}:${this.password}`);
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * 执行 HTTP 请求（带重试和故障转移）
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: URLSearchParams | FormData;
    },
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const url = this.buildUrl(path, options?.params);
        const headers = this.buildHeaders();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: options?.body,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new NacosClientError(
              `Nacos API request failed: ${response.status} ${response.statusText}. ${errorText}`,
            );
          }

          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            return (await response.json()) as T;
          } else {
            return (await response.text()) as T;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是网络错误或超时，尝试切换到下一个服务器
        if (
          error instanceof TypeError ||
          error instanceof DOMException ||
          (error instanceof NacosClientError && error.message.includes('aborted'))
        ) {
          if (attempt < this.retryCount) {
            this.switchToNextServer();
            await this.sleep(this.retryDelay);
            continue;
          }
        }

        // 其他错误直接抛出
        throw lastError;
      }
    }

    throw new NacosClientError(`Request failed after ${this.retryCount + 1} attempts`, lastError);
  }

  /**
   * GET 请求
   */
  public async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  /**
   * POST 请求
   */
  public async post<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    body?: URLSearchParams | FormData,
  ): Promise<T> {
    return this.request<T>('POST', path, { params, body });
  }

  /**
   * DELETE 请求
   */
  public async delete<T>(
    path: string,
    params?: Record<string, string | number | boolean | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>('DELETE', path, { params });
  }

  /**
   * 获取命名空间 ID
   */
  public getNamespaceId(): string | undefined {
    return this.namespaceId;
  }

  /**
   * 休眠（用于重试延迟）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

