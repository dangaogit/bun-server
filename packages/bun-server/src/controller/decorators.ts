import 'reflect-metadata';

/**
 * 参数元数据键
 */
const PARAM_METADATA_KEY = Symbol('param');

/**
 * 参数类型枚举
 */
export enum ParamType {
  BODY = 'body',
  QUERY = 'query',
  PARAM = 'param',
  HEADER = 'header',
  SESSION = 'session',
  CONTEXT = 'context',
  QUERY_MAP = 'query_map',
  HEADER_MAP = 'header_map',
}

/**
 * 参数元数据
 */
export interface ParamMetadata {
  type: ParamType;
  key?: string;
  index: number;
  options?: unknown;
}

/**
 * 参数装饰器工厂
 * @param type - 参数类型
 * @param key - 参数键（可选）
 * @returns 参数装饰器
 */
export function createParamDecorator(type: ParamType, key?: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams: ParamMetadata[] =
      Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey as string) || [];
    existingParams.push({ type, key, index: parameterIndex });
    Reflect.defineMetadata(PARAM_METADATA_KEY, existingParams, target, propertyKey as string);
  };
}

/**
 * Body 参数装饰器
 * @param key - 参数键（可选，用于提取对象中的特定字段）
 */
export function Body(key?: string) {
  return createParamDecorator(ParamType.BODY, key);
}

/**
 * Query 参数装饰器
 * @param key - 查询参数键
 */
export function Query(key: string) {
  return createParamDecorator(ParamType.QUERY, key);
}

/**
 * Param 参数装饰器（路径参数）
 * @param key - 路径参数键
 */
export function Param(key: string) {
  return createParamDecorator(ParamType.PARAM, key);
}

/**
 * Header 参数装饰器
 * @param key - 请求头键
 */
export function Header(key: string) {
  return createParamDecorator(ParamType.HEADER, key);
}

/**
 * QueryMap 注解选项
 */
export interface QueryMapOptions<T = unknown> {
  transform?: (input: Record<string, string | string[]>) => T | Promise<T>;
  validate?: (dto: T) => void | Promise<void>;
}

/**
 * HeaderMap 注解选项
 */
export interface HeaderMapOptions<T = unknown> {
  normalize?: boolean;
  pick?: string[];
  transform?: (input: Record<string, string | string[]>) => T | Promise<T>;
  validate?: (dto: T) => void | Promise<void>;
}

/**
 * QueryMap 参数装饰器
 * 一次性注入完整查询对象
 */
export function QueryMap<T = Record<string, string | string[]>>(
  options?: QueryMapOptions<T> | ((input: Record<string, string | string[]>) => T | Promise<T>),
) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams: ParamMetadata[] =
      Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey as string) || [];
    const normalizedOptions: QueryMapOptions<T> =
      typeof options === 'function' ? { transform: options } : options ?? {};
    existingParams.push({ type: ParamType.QUERY_MAP, index: parameterIndex, options: normalizedOptions });
    Reflect.defineMetadata(PARAM_METADATA_KEY, existingParams, target, propertyKey as string);
  };
}

/**
 * HeaderMap 参数装饰器
 * 一次性注入完整 headers 对象
 */
export function HeaderMap<T = Record<string, string | string[]>>(
  options?: HeaderMapOptions<T> | ((input: Record<string, string | string[]>) => T | Promise<T>),
) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingParams: ParamMetadata[] =
      Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey as string) || [];
    const normalizedOptions: HeaderMapOptions<T> =
      typeof options === 'function' ? { transform: options } : options ?? {};
    existingParams.push({ type: ParamType.HEADER_MAP, index: parameterIndex, options: normalizedOptions });
    Reflect.defineMetadata(PARAM_METADATA_KEY, existingParams, target, propertyKey as string);
  };
}

/**
 * Context 参数装饰器
 * 用于在控制器方法中注入当前请求的 Context 对象
 * 
 * @example
 * ```typescript
 * @GET('/users/:id')
 * public async getUser(@Param('id') id: string, @Context() context: Context) {
 *   // 可以直接访问 context
 *   const header = context.getHeader('Authorization');
 *   return { id, header };
 * }
 * ```
 */
export function Context() {
  return createParamDecorator(ParamType.CONTEXT);
}

/**
 * 获取参数元数据
 * @param target - 目标对象
 * @param propertyKey - 属性键
 * @returns 参数元数据列表
 */
export function getParamMetadata(target: any, propertyKey: string): ParamMetadata[] {
  return Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey) || [];
}

