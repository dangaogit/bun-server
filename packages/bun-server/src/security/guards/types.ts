import type { Context } from '../../core/context';
import type { ResponseBuilder } from '../../request/response';
import type { Constructor } from '../../core/types';
import type { ServerWebSocket } from 'bun';

/**
 * 守卫接口
 * 守卫用于决定请求是否可以继续执行
 */
export interface CanActivate {
  /**
   * 判断是否允许访问
   * @param context - 执行上下文
   * @returns 是否允许访问，可以是同步或异步的布尔值
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/**
 * HTTP 参数主机接口
 * 提供 HTTP 请求相关的上下文信息
 */
export interface HttpArgumentsHost {
  /**
   * 获取请求上下文
   * @returns Context 对象
   */
  getRequest(): Context;

  /**
   * 获取响应构建器
   * @returns ResponseBuilder 对象（可能为 undefined）
   */
  getResponse(): ResponseBuilder | undefined;
}

/**
 * WebSocket 参数主机接口
 * 提供 WebSocket 连接相关的上下文信息
 */
export interface WsArgumentsHost {
  /**
   * 获取 WebSocket 客户端
   * @returns WebSocket 连接对象
   */
  getClient(): ServerWebSocket<unknown>;

  /**
   * 获取消息数据
   * @returns 消息数据
   */
  getData(): unknown;
}

/**
 * 执行上下文接口
 * 提供请求处理过程中的上下文信息
 */
export interface ExecutionContext {
  /**
   * 获取 HTTP 上下文
   * @returns HTTP 参数主机
   */
  switchToHttp(): HttpArgumentsHost;

  /**
   * 获取 WebSocket 上下文
   * @returns WebSocket 参数主机
   */
  switchToWs(): WsArgumentsHost;

  /**
   * 获取当前处理的控制器类
   * @returns 控制器类构造函数
   */
  getClass(): Constructor<unknown>;

  /**
   * 获取当前处理的方法
   * @returns 方法函数
   */
  getHandler(): Function;

  /**
   * 获取方法名
   * @returns 方法名字符串
   */
  getMethodName(): string;

  /**
   * 获取方法或类的元数据
   * @param key - 元数据键
   * @returns 元数据值，如果不存在则返回 undefined
   */
  getMetadata<T>(key: string | symbol): T | undefined;

  /**
   * 获取请求参数
   * @returns 请求参数数组
   */
  getArgs(): unknown[];
}

/**
 * 守卫类型：可以是守卫类构造函数或守卫实例
 */
export type GuardType = Constructor<CanActivate> | CanActivate;

/**
 * 守卫元数据
 */
export interface GuardMetadata {
  /**
   * 守卫列表
   */
  guards: GuardType[];
}

/**
 * 守卫配置选项
 */
export interface GuardOptions {
  /**
   * 是否跳过全局守卫
   * @default false
   */
  skipGlobalGuards?: boolean;
}

/**
 * 守卫元数据键
 */
export const GUARDS_METADATA_KEY = Symbol('@dangao/bun-server:guards');

/**
 * 守卫注册表 Token
 */
export const GUARD_REGISTRY_TOKEN = Symbol('@dangao/bun-server:guard-registry');

/**
 * Roles 元数据键
 */
export const ROLES_METADATA_KEY = Symbol('@dangao/bun-server:roles');

