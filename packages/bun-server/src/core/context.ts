import { BodyParser } from '../request/body-parser';
import type { UploadedFileInfo } from '../files';
import type { BodyInit } from 'bun'
import { type URLSearchParams, URL } from 'url';

/**
 * 请求上下文
 * 封装 Request 和 Response，提供便捷的访问方法
 */
export class Context {
  /**
   * 原始请求对象
   */
  public readonly request: Request;

  /**
   * 响应对象（可选，由框架创建）
   */
  public response?: Response;

  /**
   * 请求 URL
   */
  public readonly url: URL;

  /**
   * 请求方法
   */
  public readonly method: string;

  /**
   * 请求路径
   */
  public readonly path: string;

  /**
   * 查询参数
   */
  public readonly query: URLSearchParams;

  /**
   * 路径参数（由路由匹配后填充）
   */
  public params: Record<string, string> = {};

  /**
   * 请求头
   */
  public readonly headers: Headers;

  /**
   * 响应头
   */
  public responseHeaders: Headers;

  /**
   * 状态码
   */
  public statusCode: number = 200;

  /**
   * 上传文件信息
   */
  public files: UploadedFileInfo[] = [];

  /**
   * 请求体（解析后的）
   */
  private _body?: unknown;

  /**
   * 是否已解析请求体
   */
  private _bodyParsed: boolean = false;

  public constructor(request: Request) {
    this.request = request;
    this.url = new URL(request.url);
    this.method = request.method;
    this.path = this.url.pathname;
    this.query = this.url.searchParams;
    this.headers = request.headers;
    this.responseHeaders = new Headers();
  }

  /**
   * 获取请求体（自动解析）
   * @returns 解析后的请求体
   */
  public async getBody(): Promise<unknown> {
    if (!this._bodyParsed) {
      this._body = await BodyParser.parse(this.request);
      this._bodyParsed = true;
    }
    return this._body;
  }

  /**
   * 获取请求体（已解析的，如果未解析则返回 undefined）
   * @returns 请求体或 undefined
   */
  public get body(): unknown {
    return this._body;
  }

  /**
   * 设置请求体
   * @param body - 请求体
   */
  public set body(body: unknown) {
    this._body = body;
    this._bodyParsed = true;
  }

  /**
   * 获取查询参数
   * @param key - 参数名
   * @returns 参数值
   */
  public getQuery(key: string): string | null {
    return this.query.get(key);
  }

  /**
   * 获取所有查询参数
   * @returns 查询参数对象
   */
  public getQueryAll(): Record<string, string> {
    const result: Record<string, string> = {};
    this.query.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 获取路径参数
   * @param key - 参数名
   * @returns 参数值
   */
  public getParam(key: string): string | undefined {
    return this.params[key];
  }

  /**
   * 获取请求头
   * @param key - 头名称
   * @returns 头值
   */
  public getHeader(key: string): string | null {
    return this.headers.get(key);
  }

  /**
   * 获取客户端 IP 地址
   * 优先从 X-Forwarded-For 头获取（代理场景），否则从连接信息获取
   * @returns 客户端 IP 地址
   */
  public getClientIp(): string {
    // 优先从 X-Forwarded-For 头获取（处理代理场景）
    const forwardedFor = this.getHeader('X-Forwarded-For');
    if (forwardedFor) {
      // X-Forwarded-For 可能包含多个 IP，取第一个
      return forwardedFor.split(',')[0].trim();
    }

    // 尝试从 X-Real-IP 头获取
    const realIp = this.getHeader('X-Real-IP');
    if (realIp) {
      return realIp.trim();
    }

    // 如果是在 Bun.serve 中，可以从 request 获取
    // 但标准 Request 对象没有直接 IP 信息，返回默认值
    return 'unknown';
  }

  /**
   * 设置响应头
   * @param key - 头名称
   * @param value - 头值
   */
  public setHeader(key: string, value: string): void {
    this.responseHeaders.set(key, value);
  }

  /**
   * 设置状态码
   * @param code - HTTP 状态码
   */
  public setStatus(code: number): void {
    this.statusCode = code;
  }

  /**
   * 创建响应
   * @param body - 响应体
   * @param init - 响应初始化选项
   * @returns Response 对象
   */
  public createResponse(body?: unknown, init?: ResponseInit): Response {
    // 如果已经是 Response 对象，直接返回
    if (body instanceof Response) {
      return body;
    }

    const headers = new Headers(this.responseHeaders);
    
    // 如果 body 是对象，自动序列化为 JSON
    if (body !== undefined && body !== null) {
      if (typeof body === 'object' && !(body instanceof ArrayBuffer) && !(body instanceof Blob)) {
        headers.set('Content-Type', 'application/json');
        const jsonString = JSON.stringify(body);
        return new Response(jsonString, {
          status: this.statusCode,
          headers,
          ...init,
        });
      }
    }

    return new Response(body as BodyInit, {
      status: this.statusCode,
      headers,
      ...init,
    });
  }
}

