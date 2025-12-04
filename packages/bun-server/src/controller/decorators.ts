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
}

/**
 * 参数元数据
 */
export interface ParamMetadata {
  type: ParamType;
  key?: string;
  index: number;
}

/**
 * 参数装饰器工厂
 * @param type - 参数类型
 * @param key - 参数键（可选）
 * @returns 参数装饰器
 */
function createParamDecorator(type: ParamType, key?: string) {
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
 * 获取参数元数据
 * @param target - 目标对象
 * @param propertyKey - 属性键
 * @returns 参数元数据列表
 */
export function getParamMetadata(target: any, propertyKey: string): ParamMetadata[] {
  return Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey) || [];
}

