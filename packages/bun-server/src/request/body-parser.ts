/**
 * 请求体解析器
 * 支持 JSON、FormData、URLEncoded 等格式
 */
export class BodyParser {
  /**
   * 解析请求体
   * @param request - 请求对象
   * @returns 解析后的请求体
   */
  public static async parse(request: Request): Promise<unknown> {
    const contentType = request.headers.get('content-type') ?? '';

    // 检查是否有请求体（GET 和 HEAD 请求通常没有 body）
    if (request.method === 'GET' || request.method === 'HEAD') {
      return undefined;
    }

    // 检查 Content-Length
    const contentLength = request.headers.get('content-length');
    if (contentLength === '0') {
      return undefined;
    }

    // 尝试解析请求体
    try {
      // JSON 格式
      if (contentType.includes('application/json')) {
        const result = await this.parseJSON(request);
        return result;
      }

      // FormData 格式
      if (contentType.includes('multipart/form-data')) {
        return await this.parseFormData(request);
      }

      // URLEncoded 格式
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const result = await this.parseURLEncoded(request);
        return result;
      }

      // 文本格式
      if (contentType.includes('text/')) {
        return await this.parseText(request);
      }

      // 如果没有 Content-Type 或 Content-Length，尝试读取 body
      // 如果读取成功，尝试解析为 JSON，否则返回文本
      if (!contentType && !contentLength) {
        try {
          const text = await request.text();
          if (!text || text.length === 0) {
            return undefined;
          }
          // 尝试解析为 JSON
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        } catch {
          return undefined;
        }
      }

      // 默认尝试 JSON，失败后返回原始文本
      const fallbackText = await request.text();
      if (!fallbackText) {
        return undefined;
      }
      try {
        return JSON.parse(fallbackText);
      } catch {
        return fallbackText;
      }
    } catch (error) {
      // 如果读取失败，返回 undefined
      return undefined;
    }
  }

  /**
   * 解析 JSON 格式
   * @param request - 请求对象
   * @returns 解析后的对象
   */
  private static async parseJSON(request: Request): Promise<unknown> {
    const text = await request.text();
    if (!text) {
      return undefined;
    }
    return JSON.parse(text);
  }

  /**
   * 解析 FormData 格式
   * @param request - 请求对象
   * @returns 解析后的 FormData 对象
   */
  private static async parseFormData(request: Request): Promise<FormData> {
    return await request.formData() as FormData;
  }

  /**
   * 解析 URLEncoded 格式
   * @param request - 请求对象
   * @returns 解析后的对象
   */
  private static async parseURLEncoded(request: Request): Promise<Record<string, string> | undefined> {
    const text = await request.text();
    if (!text || text.length === 0) {
      return undefined;
    }

    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 解析文本格式
   * @param request - 请求对象
   * @returns 文本内容
   */
  private static async parseText(request: Request): Promise<string> {
    return await request.text();
  }
}
