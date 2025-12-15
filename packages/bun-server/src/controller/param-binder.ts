import type { Context } from '../core/context';
import {
  getParamMetadata,
  ParamType,
  type ParamMetadata,
  type QueryMapOptions,
  type HeaderMapOptions,
} from './decorators';
import { Container } from '../di/container';
import { SessionService } from '../session/service';
import { SESSION_SERVICE_TOKEN } from '../session/types';
import { contextStore } from '../core/context-service';

/**
 * 参数绑定器
 * 根据装饰器元数据绑定参数
 */
export class ParamBinder {
  /**
   * 绑定参数
   * @param target - 目标对象
   * @param propertyKey - 属性键
   * @param context - 请求上下文
   * @param container - DI 容器（用于解析 Session）
   * @returns 参数数组
   */
  public static async bind(
    target: any,
    propertyKey: string,
    context: Context,
    container?: Container,
  ): Promise<unknown[]> {
    const metadata = getParamMetadata(target, propertyKey);
    const params: unknown[] = [];

    // 按索引排序
    metadata.sort((a, b) => a.index - b.index);

    // 绑定参数
    for (const meta of metadata) {
      const value = await this.getValue(meta, context, container);
      params[meta.index] = value;
    }

    // 确保参数数组是连续的（填充 undefined）
    // 例如：如果只有 index 1 的参数，params 应该是 [undefined, value]
    const maxIndex = metadata.length > 0 ? Math.max(...metadata.map((m) => m.index)) : -1;
    for (let i = 0; i <= maxIndex; i++) {
      if (!(i in params)) {
        params[i] = undefined;
      }
    }

    return params;
  }

  /**
   * 获取参数值
   * @param meta - 参数元数据
   * @param context - 请求上下文
   * @param container - DI 容器（用于解析 Session）
   * @returns 参数值
   */
  private static async getValue(meta: ParamMetadata, context: Context, container?: Container): Promise<unknown> {
    switch (meta.type) {
      case ParamType.BODY:
        return await this.getBodyValue(meta.key, context);
      case ParamType.QUERY:
        // Query 装饰器要求提供 key
        if (!meta.key) {
          throw new Error('@Query() decorator requires a key parameter');
        }
        return this.getQueryValue(meta.key, context);
      case ParamType.PARAM:
        // Param 装饰器要求提供 key
        if (!meta.key) {
          throw new Error('@Param() decorator requires a key parameter');
        }
        return this.getParamValue(meta.key, context);
      case ParamType.HEADER:
        // Header 装饰器要求提供 key
        if (!meta.key) {
          throw new Error('@Header() decorator requires a key parameter');
        }
        return this.getHeaderValue(meta.key, context);
      case ParamType.SESSION:
        // Session 装饰器需要 container
        if (!container) {
          throw new Error('@Session() decorator requires a Container instance');
        }
        // 从 Context 中获取 Session（由中间件设置）
        const session = (context as unknown as { session?: unknown }).session;
        if (session) {
          return session;
        }
        // 如果没有 Session，尝试创建新 Session
        try {
          const sessionService = container.resolve<SessionService>(
            SESSION_SERVICE_TOKEN,
          );
          if (sessionService) {
            const newSession = await sessionService.create();
            (context as unknown as { session: typeof newSession }).session =
              newSession;
            (context as unknown as { sessionId: string }).sessionId = newSession.id;
            return newSession;
          }
        } catch {
          // SessionService 未注册，返回 undefined
        }
        return undefined;
      case ParamType.CONTEXT:
        // 从 AsyncLocalStorage 获取当前请求的 Context
        return contextStore.getStore() ?? context;
      case ParamType.QUERY_MAP:
        return await this.getQueryMapValue(meta.options as QueryMapOptions, context);
      case ParamType.HEADER_MAP:
        return await this.getHeaderMapValue(meta.options as HeaderMapOptions, context);
      default:
        return undefined;
    }
  }

  /**
   * 获取 Body 值
   * @param key - 键（可选）
   * @param context - 请求上下文
   * @returns Body 值
   */
  private static async getBodyValue(key: string | undefined, context: Context): Promise<unknown> {
    const body = await context.getBody();
    if (!key) {
      return body;
    }
    if (typeof body === 'object' && body !== null) {
      return (body as Record<string, unknown>)[key];
    }
    return undefined;
  }

  /**
   * 获取 Query 值
   * @param key - 键
   * @param context - 请求上下文
   * @returns Query 值
   */
  private static getQueryValue(key: string, context: Context): string | null {
    return context.getQuery(key);
  }

  /**
   * 获取 Param 值
   * @param key - 键
   * @param context - 请求上下文
   * @returns Param 值
   */
  private static getParamValue(key: string, context: Context): string | undefined {
    return context.getParam(key);
  }

  /**
   * 获取 Header 值
   * @param key - 键
   * @param context - 请求上下文
   * @returns Header 值
   */
  private static getHeaderValue(key: string, context: Context): string | null {
    return context.getHeader(key);
  }

  /**
   * 获取 QueryMap 值
   * @param options - 装饰器选项
   * @param context - 请求上下文
   */
  private static async getQueryMapValue(
    options: QueryMapOptions | undefined,
    context: Context,
  ): Promise<unknown> {
    const result: Record<string, string | string[]> = {};
    const searchParams = context.query;
    // 收集所有键，处理重复 key -> string[]
    for (const key of searchParams.keys()) {
      const values = searchParams.getAll(key);
      if (values.length === 1) {
        result[key] = values[0];
      } else {
        result[key] = values;
      }
    }

    let output: unknown = result;
    if (options?.transform) {
      output = await options.transform(result);
    }
    if (options?.validate) {
      await options.validate(output as never);
    }
    return output;
  }

  /**
   * 获取 HeaderMap 值
   * @param options - 装饰器选项
   * @param context - 请求上下文
   */
  private static async getHeaderMapValue(
    options: HeaderMapOptions | undefined,
    context: Context,
  ): Promise<unknown> {
    const normalize = options?.normalize ?? true;
    // Headers API 总是将 header 名称规范化为小写，所以 pick 数组也应该总是小写化
    const pick = options?.pick?.map((key) => key.toLowerCase());
    const headers = context.headers;
    const result: Record<string, string | string[]> = {};

    headers.forEach((value, rawKey) => {
      // Headers API 总是返回小写的 key，所以 rawKey 已经是小写
      // normalize 选项决定结果中的 key 格式（虽然实际上总是小写）
      const key = normalize ? rawKey.toLowerCase() : rawKey;
      if (pick && !pick.includes(key)) {
        return;
      }
      // 处理可能的多值（逗号分隔），统一 trim
      const parts = value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (parts.length <= 1) {
        // 单值也保持 trim 后的形态
        result[key] = parts[0] ?? '';
      } else {
        result[key] = parts;
      }
    });

    let output: unknown = result;
    if (options?.transform) {
      output = await options.transform(result);
    }
    if (options?.validate) {
      await options.validate(output as never);
    }
    return output;
  }
}

