import type { Middleware } from '../middleware';

export interface CorsOptions {
  origin?: string | string[] | '*';
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

function getOriginHeader(option: CorsOptions['origin'], requestOrigin: string | null): string {
  if (!option || option === '*') {
    return '*';
  }

  if (Array.isArray(option)) {
    if (requestOrigin && option.includes(requestOrigin)) {
      return requestOrigin;
    }
    return option[0];
  }

  return option;
}

/**
 * CORS 中间件
 */
export function createCorsMiddleware(options: CorsOptions = {}): Middleware {
  const methods = options.methods ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  const allowedHeaders = options.allowedHeaders ?? ['Content-Type', 'Authorization'];
  const exposedHeaders = options.exposedHeaders ?? [];
  const credentials = options.credentials ?? true;
  const maxAge = options.maxAge ?? 600;

  return async (context, next) => {
    const requestOrigin = context.getHeader('Origin');
    const originHeader = getOriginHeader(options.origin ?? '*', requestOrigin);

    context.setHeader('Access-Control-Allow-Origin', originHeader);
    if (credentials) {
      context.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    context.setHeader('Access-Control-Allow-Methods', methods.join(','));
    context.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
    if (exposedHeaders.length > 0) {
      context.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(','));
    }
    context.setHeader('Access-Control-Max-Age', maxAge.toString());

    if (context.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: context.responseHeaders });
    }

    return await next();
  };
}


