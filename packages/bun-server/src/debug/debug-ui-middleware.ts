import type { Context } from '../core/context';
import type { Middleware, NextFunction } from '../middleware';
import type { RequestRecorder } from './recorder';
import { createDebugHTML } from './ui';

/**
 * 创建 Debug UI 中间件
 * 处理 Debug UI 页面和 API 端点
 */
export function createDebugUIMiddleware(
  recorder: RequestRecorder,
  basePath: string,
): Middleware {
  const normalizedBase = basePath.endsWith('/') && basePath.length > 1
    ? basePath.slice(0, -1)
    : basePath;
  const apiPrefix = `${normalizedBase}/api`;

  return async (context: Context, next: NextFunction): Promise<Response> => {
    const path = context.path;

    if (!path.startsWith(normalizedBase)) {
      return await next();
    }

    const jsonResponse = (data: unknown, status = 200): Response => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    };

    if (path === normalizedBase || path === `${normalizedBase}/`) {
      const html = createDebugHTML(normalizedBase);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (path === `${apiPrefix}/records`) {
      if (context.method === 'GET') {
        const records = recorder.getAll();
        return jsonResponse(records);
      }
      if (context.method === 'DELETE') {
        recorder.clear();
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const recordsIdPrefix = `${apiPrefix}/records/`;
    if (path.startsWith(recordsIdPrefix)) {
      const id = path.slice(recordsIdPrefix.length).split('/')[0];
      if (!id) {
        return jsonResponse({ error: 'Invalid record id' }, 400);
      }
      const record = recorder.getById(id);
      if (!record) {
        return jsonResponse({ error: 'Not found' }, 404);
      }
      return jsonResponse(record);
    }

    const replayPrefix = `${apiPrefix}/replay/`;
    if (path.startsWith(replayPrefix) && context.method === 'POST') {
      const id = path.slice(replayPrefix.length).split('/')[0];
      if (!id) {
        return jsonResponse({ ok: false, error: 'Invalid record id' }, 400);
      }
      const record = recorder.getById(id);
      if (!record) {
        return jsonResponse({ ok: false, error: 'Record not found' }, 404);
      }

      try {
        const origin = new URL(context.request.url).origin;
        const targetUrl = new URL(record.request.path, origin).href;

        const headers = new Headers(record.request.headers);
        let body: string | undefined;
        if (record.request.body !== undefined && record.request.body !== null) {
          body = JSON.stringify(record.request.body);
        }

        const replayedRequest = new Request(targetUrl, {
          method: record.request.method,
          headers,
          body,
        });

        const response = await fetch(replayedRequest);
        const responseText = await response.text();

        return jsonResponse({
          ok: true,
          status: response.status,
          body: responseText,
        });
      } catch (error) {
        return jsonResponse({
          ok: false,
          error: (error as Error).message,
        }, 500);
      }
    }

    return await next();
  };
}
