import { normalize, resolve, sep } from 'path';

import type { Middleware } from '../middleware';
import type { HeadersInit } from 'bun'

export interface StaticFileOptions {
  root: string;
  prefix?: string;
  indexFile?: string;
  enableCache?: boolean;
  headers?: HeadersInit | Headers;
}

function isSubPath(root: string, target: string): boolean {
  const normalizedRoot = normalize(root);
  const normalizedTarget = normalize(target);
  if (normalizedRoot === normalizedTarget) {
    return true;
  }
  const rootWithSep = normalizedRoot.endsWith(sep) ? normalizedRoot : normalizedRoot + sep;
  return normalizedTarget.startsWith(rootWithSep);
}

/**
 * 静态文件服务中间件
 */
export function createStaticFileMiddleware(options: StaticFileOptions): Middleware {
  if (!options.root) {
    throw new Error('Static file middleware requires a root directory');
  }

  const root = resolve(options.root);
  const prefix = options.prefix ?? '/';
  const indexFile = options.indexFile ?? 'index.html';
  const enableCache = options.enableCache ?? true;

  return async (context, next) => {
    if (!context.path.startsWith(prefix)) {
      return await next();
    }

    let relativePath = context.path.slice(prefix.length);
    if (!relativePath || relativePath === '') {
      relativePath = '/';
    }

    let cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    if (cleanPath === '') {
      cleanPath = '.';
    }

    const segments = cleanPath.split('/').filter((segment) => segment.length > 0);
    if (segments.some((segment) => segment === '..')) {
      context.setStatus(403);
      return context.createResponse({ error: 'Forbidden' });
    }

    let targetPath = resolve(root, cleanPath);
    if (context.path.endsWith('/') || relativePath === '/') {
      targetPath = resolve(root, cleanPath, indexFile);
    }

    if (!isSubPath(root, targetPath)) {
      context.setStatus(403);
      return context.createResponse({ error: 'Forbidden' });
    }

    const file = Bun.file(targetPath);
    if (!(await file.exists())) {
      return await next();
    }

    const headers = new Headers(options.headers);
    if (enableCache) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    if (!headers.has('Content-Type') && file.type) {
      headers.set('Content-Type', file.type);
    }

    return new Response(file, {
      status: 200,
      headers,
    });
  };
}


