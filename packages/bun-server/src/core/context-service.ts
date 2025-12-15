import { AsyncLocalStorage } from 'async_hooks';
import { Context } from './context';
import { Injectable } from '../di/decorators';

/**
 * Context 存储（AsyncLocalStorage）
 * 用于在请求级别存储和访问 Context
 */
export const contextStore = new AsyncLocalStorage<Context>();

/**
 * ContextService Token
 */
export const CONTEXT_SERVICE_TOKEN = Symbol('ContextService');

/**
 * 上下文服务
 * 提供统一的上下文访问服务，通过依赖注入方式访问请求上下文
 */
@Injectable()
export class ContextService {
  /**
   * 获取当前请求的 Context
   * 使用 AsyncLocalStorage 实现请求级别隔离
   * @returns 当前请求的 Context，如果不在请求上下文中则返回 undefined
   */
  public getContext(): Context | undefined {
    return contextStore.getStore();
  }

  /**
   * 获取请求头
   * @param key - 请求头键名
   * @returns 请求头值，如果不存在则返回 null
   */
  public getHeader(key: string): string | null {
    const context = this.getContext();
    return context?.getHeader(key) ?? null;
  }

  /**
   * 获取查询参数
   * @param key - 查询参数键名
   * @returns 查询参数值，如果不存在则返回 null
   */
  public getQuery(key: string): string | null {
    const context = this.getContext();
    return context?.getQuery(key) ?? null;
  }

  /**
   * 获取所有查询参数
   * @returns 查询参数对象
   */
  public getQueryAll(): Record<string, string> {
    const context = this.getContext();
    return context?.getQueryAll() ?? {};
  }

  /**
   * 获取路径参数
   * @param key - 路径参数键名
   * @returns 路径参数值，如果不存在则返回 undefined
   */
  public getParam(key: string): string | undefined {
    const context = this.getContext();
    return context?.getParam(key);
  }

  /**
   * 获取请求体
   * @returns 请求体（已解析的）
   */
  public getBody(): unknown {
    const context = this.getContext();
    return context?.body ?? null;
  }

  /**
   * 获取请求方法
   * @returns HTTP 方法
   */
  public getMethod(): string {
    const context = this.getContext();
    return context?.method ?? '';
  }

  /**
   * 获取请求路径
   * @returns 请求路径
   */
  public getPath(): string {
    const context = this.getContext();
    return context?.path ?? '';
  }

  /**
   * 获取请求 URL
   * @returns 请求 URL
   */
  public getUrl(): URL | undefined {
    const context = this.getContext();
    return context?.url;
  }

  /**
   * 获取客户端 IP 地址
   * @returns 客户端 IP 地址
   */
  public getClientIp(): string {
    const context = this.getContext();
    return context?.getClientIp() ?? 'unknown';
  }

  /**
   * 设置响应头
   * @param key - 响应头键名
   * @param value - 响应头值
   */
  public setHeader(key: string, value: string): void {
    const context = this.getContext();
    context?.setHeader(key, value);
  }

  /**
   * 设置状态码
   * @param code - HTTP 状态码
   */
  public setStatus(code: number): void {
    const context = this.getContext();
    context?.setStatus(code);
  }
}

