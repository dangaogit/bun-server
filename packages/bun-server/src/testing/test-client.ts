import type { Application } from '../core/application';

interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

interface TestResponse {
  status: number;
  headers: Headers;
  body: unknown;
  text: string;
  ok: boolean;
}

/**
 * HTTP 测试客户端
 * 基于 fetch API，提供简洁的 HTTP 请求方法
 */
export class TestHttpClient {
  private readonly baseUrl: string;
  private readonly app: Application;

  public constructor(baseUrl: string, app: Application) {
    this.baseUrl = baseUrl;
    this.app = app;
  }

  /**
   * 发送 GET 请求
   */
  public async get(path: string, options?: RequestOptions): Promise<TestResponse> {
    return this.request('GET', path, options);
  }

  /**
   * 发送 POST 请求
   */
  public async post(path: string, options?: RequestOptions): Promise<TestResponse> {
    return this.request('POST', path, options);
  }

  /**
   * 发送 PUT 请求
   */
  public async put(path: string, options?: RequestOptions): Promise<TestResponse> {
    return this.request('PUT', path, options);
  }

  /**
   * 发送 DELETE 请求
   */
  public async delete(path: string, options?: RequestOptions): Promise<TestResponse> {
    return this.request('DELETE', path, options);
  }

  /**
   * 发送 PATCH 请求
   */
  public async patch(path: string, options?: RequestOptions): Promise<TestResponse> {
    return this.request('PATCH', path, options);
  }

  /**
   * 关闭测试服务器
   */
  public async close(): Promise<void> {
    await this.app.stop();
  }

  private async request(method: string, path: string, options?: RequestOptions): Promise<TestResponse> {
    let url = `${this.baseUrl}${path}`;

    if (options?.query) {
      const params = new URLSearchParams(options.query);
      url += `?${params.toString()}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    };

    if (options?.body && method !== 'GET') {
      fetchOptions.body = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    const text = await response.text();

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return {
      status: response.status,
      headers: response.headers,
      body,
      text,
      ok: response.ok,
    };
  }
}
