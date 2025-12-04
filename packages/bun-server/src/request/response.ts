import type { BodyInit, HeadersInit } from 'bun';

/**
 * 响应封装类
 * 提供便捷的响应创建方法
 */
export class ResponseBuilder {
  /**
   * 创建 JSON 响应
   * @param data - 响应数据
   * @param status - HTTP 状态码
   * @param headers - 响应头
   * @returns Response 对象
   */
  public static json(
    data: unknown,
    status: number = 200,
    headers?: HeadersInit,
  ): Response {
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'application/json');

    return new Response(JSON.stringify(data), {
      status,
      headers: responseHeaders,
    });
  }

  /**
   * 创建文本响应
   * @param text - 响应文本
   * @param status - HTTP 状态码
   * @param headers - 响应头
   * @returns Response 对象
   */
  public static text(
    text: string,
    status: number = 200,
    headers?: HeadersInit,
  ): Response {
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'text/plain');

    return new Response(text, {
      status,
      headers: responseHeaders,
    });
  }

  /**
   * 创建 HTML 响应
   * @param html - HTML 内容
   * @param status - HTTP 状态码
   * @param headers - 响应头
   * @returns Response 对象
   */
  public static html(
    html: string,
    status: number = 200,
    headers?: HeadersInit,
  ): Response {
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'text/html');

    return new Response(html, {
      status,
      headers: responseHeaders,
    });
  }

  /**
   * 创建空响应
   * @param status - HTTP 状态码
   * @param headers - 响应头
   * @returns Response 对象
   */
  public static empty(status: number = 204, headers?: HeadersInit): Response {
    const responseHeaders = headers ? new Headers(headers) : undefined;
    return new Response(null, {
      status,
      headers: responseHeaders,
    });
  }

  /**
   * 创建重定向响应
   * @param url - 重定向 URL
   * @param status - HTTP 状态码（默认 302）
   * @returns Response 对象
   */
  public static redirect(url: string, status: number = 302): Response {
    return new Response(null, {
      status,
      headers: {
        Location: url,
      },
    });
  }

  /**
   * 创建错误响应
   * @param message - 错误消息
   * @param status - HTTP 状态码
   * @returns Response 对象
   */
  public static error(message: string, status: number = 500): Response {
    return this.json({ error: message }, status);
  }

  /**
   * 创建文件/下载响应
   * @param source - 文件路径或二进制数据
   * @param options - 响应配置
   * @returns Response 对象
   */
  public static file(
    source: string | Blob | ArrayBuffer | ArrayBufferView,
    options: {
      fileName?: string;
      contentType?: string;
      status?: number;
      headers?: HeadersInit;
    } = {},
  ): Response {
    const headers = new Headers(options.headers);
    if (options.fileName) {
      headers.set('Content-Disposition', `attachment; filename="${options.fileName}"`);
    }
    if (options.contentType) {
      headers.set('Content-Type', options.contentType);
    }

    if (typeof source === 'string') {
      const file = Bun.file(source);
      if (!headers.has('Content-Type') && file.type) {
        headers.set('Content-Type', file.type);
      }
      return new Response(file, {
        status: options.status ?? 200,
        headers,
      });
    }

    return new Response(source as BodyInit, {
      status: options.status ?? 200,
      headers,
    });
  }
}

