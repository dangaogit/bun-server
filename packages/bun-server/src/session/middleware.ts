import type { Context } from '../core/context';
import type { Middleware, NextFunction } from '../middleware/middleware';
import { SessionService } from './service';
import { SESSION_SERVICE_TOKEN } from './types';
import type { Container } from '../di/container';

/**
 * Session 中间件
 * 从 Cookie 中读取 Session ID，并将 Session 对象附加到 Context
 */
export function createSessionMiddleware(
  container: Container,
): Middleware {
  return async (context: Context, next: NextFunction): Promise<Response> => {
    let sessionService: SessionService | undefined;
    try {
      sessionService = container.resolve<SessionService>(
        SESSION_SERVICE_TOKEN,
      );
    } catch (_error) {
      // 如果 SessionService 未注册，跳过 Session 处理
      return await next();
    }

    if (!sessionService) {
      return await next();
    }

    // 从 Cookie 中读取 Session ID
    const cookieName = sessionService.getCookieName();
    const cookieHeader = context.request.headers.get('cookie');
    let sessionId: string | undefined;

    if (cookieHeader) {
      // Cookie 格式: "name=value; name2=value2" 或 "name=value"
      // 需要正确处理多个 Cookie 的情况
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith(`${cookieName}=`)) {
          sessionId = cookie.substring(cookieName.length + 1).trim();
          break;
        }
      }
    }

    // 如果有 Session ID，获取 Session
    if (sessionId) {
      const session = await sessionService.get(sessionId);
      if (session) {
        // 将 Session 附加到 Context
        (context as unknown as { session: typeof session }).session = session;
        (context as unknown as { sessionId: string }).sessionId = sessionId;
      } else {
        // Session 已过期或不存在，清除 sessionId
        sessionId = undefined;
      }
    }

    // 如果没有 Session，创建一个新 Session
    if (!sessionId) {
      const newSession = await sessionService.create();
      (context as unknown as { session: typeof newSession }).session =
        newSession;
      (context as unknown as { sessionId: string }).sessionId = newSession.id;
      sessionId = newSession.id;
    }

    // 调用下一个中间件
    const response = await next();

    // 设置或更新 Cookie
    const currentSessionId = (context as unknown as { sessionId?: string })
      .sessionId;
    if (currentSessionId) {
      const cookieOptions = sessionService.getCookieOptions();
      const maxAge = sessionService.getMaxAge();
      const cookieValue = buildCookie(
        cookieName,
        currentSessionId,
        {
          ...cookieOptions,
          maxAge,
        },
      );
      
      // 创建新的 Response，添加 Set-Cookie 头
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Set-Cookie', cookieValue);
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  };
}

/**
 * 构建 Cookie 字符串
 */
function buildCookie(
  name: string,
  value: string,
  options: {
    secure?: boolean;
    httpOnly?: boolean;
    path?: string;
    domain?: string;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  },
): string {
  let cookie = `${name}=${value}`;

  if (options.path) {
    cookie += `; Path=${options.path}`;
  }

  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }

  if (options.maxAge) {
    cookie += `; Max-Age=${Math.floor(options.maxAge / 1000)}`;
  }

  if (options.secure) {
    cookie += '; Secure';
  }

  if (options.httpOnly) {
    cookie += '; HttpOnly';
  }

  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }

  return cookie;
}
