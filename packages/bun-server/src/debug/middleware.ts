import type { Context } from '../core/context';
import type { Middleware, NextFunction } from '../middleware';
import type { RequestRecorder } from './recorder';
import type { RequestRecord } from './types';
import { RouteRegistry } from '../router/registry';
import type { HttpMethod } from '../router/types';

interface RouteHandlerInfo {
  controller?: { name?: string };
  method?: string;
}

/**
 * 将 Headers 转为 Record<string, string>
 */
function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

/**
 * 获取响应体大小
 */
async function getResponseBodySize(response: Response): Promise<number> {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const n = parseInt(contentLength, 10);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  if (response.body) {
    const clone = response.clone();
    const buf = await clone.arrayBuffer();
    return buf.byteLength;
  }
  return 0;
}

/**
 * 创建调试录制中间件
 * @param recorder - 请求录制器
 * @param options - 配置选项
 */
export function createDebugMiddleware(
  recorder: RequestRecorder,
  options: {
    recordBody?: boolean;
    basePath?: string;
  } = {},
): Middleware {
  const recordBody = options.recordBody ?? true;
  const basePath = options.basePath ?? '/_debug';

  return async (context: Context, next: NextFunction): Promise<Response> => {
    const startTime = Date.now();

    const requestHeaders: Record<string, string> = {};
    context.headers.forEach((value, key) => {
      requestHeaders[key] = value;
    });

    let requestBody: unknown = undefined;
    if (recordBody && ['POST', 'PUT', 'PATCH'].includes(context.method)) {
      try {
        requestBody = await context.getBody();
      } catch {
        requestBody = undefined;
      }
    }

    const response = await next();
    const endTime = Date.now();
    const totalMs = endTime - startTime;

    if (context.path.startsWith(basePath)) {
      return response;
    }

    const responseHeaders = headersToRecord(response.headers);
    const bodySize = await getResponseBodySize(response);

    const routeHandler = (context as { routeHandler?: RouteHandlerInfo }).routeHandler;
    let matchedRoute: string | undefined;
    try {
      const registry = RouteRegistry.getInstance();
      const router = registry.getRouter();
      const route = router.findRoute(context.method as HttpMethod, context.path);
      if (route) {
        matchedRoute = route.path;
      }
    } catch {
      matchedRoute = undefined;
    }

    const record: Omit<RequestRecord, 'id'> = {
      timestamp: startTime,
      request: {
        method: context.method,
        path: context.path,
        headers: requestHeaders,
        body: requestBody,
      },
      response: {
        status: response.status,
        headers: responseHeaders,
        bodySize,
      },
      timing: {
        total: totalMs,
      },
      metadata: {
        matchedRoute,
        controller: routeHandler?.controller?.name,
        methodName: routeHandler?.method,
      },
    };

    recorder.record(record);

    return response;
  };
}
