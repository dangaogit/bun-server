import { join, normalize } from 'node:path';
import { stat } from 'node:fs/promises';

import type { Middleware } from '../middleware';

export interface StaticFileOptions {
  root: string;
  prefix?: string;
  fallthrough?: boolean;
}

function safeResolve(root: string, requestPath: string): string {
  const normalized = normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return join(root, normalized);
}

export function createStaticFileMiddleware(options: StaticFileOptions): Middleware {
  const prefix = options.prefix?.replace(/\/$/, '') || '';
  const fallthrough = options.fallthrough ?? true;

  return async (context, next) => {
    if (context.method !== 'GET' && context.method !== 'HEAD') {
      return await next();
    }

    if (prefix && !context.path.startsWith(prefix)) {
      return await next();
    }

    const relativePath = prefix ? context.path.slice(prefix.length) || '/' : context.path;
    const filePath = safeResolve(options.root, relativePath);
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        return await next();
      }

      const file = Bun.file(filePath);
      return new Response(file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });
    } catch {
      if (fallthrough) {
        return await next();
      }
      return context.createResponse({ error: 'File Not Found' }, { status: 404 });
    }
  };
}


