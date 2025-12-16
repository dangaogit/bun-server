import { BodyParser } from './body-parser';
import { type URLSearchParams, URL } from 'url';

/**
 * 请求封装类
 * 扩展原生 Request，提供便捷方法
 */
export class RequestWrapper {
  /**
   * 原始请求对象
   */
  public readonly request: Request;

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
   * 请求头
   */
  public readonly headers: Headers;

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
  }

  /**
   * 获取请求体（自动解析）
   * @returns 解析后的请求体
   */
  public async body(): Promise<unknown> {
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
  public getBody(): unknown {
    return this._body;
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
   * 获取请求头
   * @param key - 头名称
   * @returns 头值
   */
  public getHeader(key: string): string | null {
    return this.headers.get(key);
  }
}

