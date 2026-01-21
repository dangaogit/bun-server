import 'reflect-metadata';
import type { ServerWebSocket } from 'bun';
import type { Context } from '../../core/context';
import type { ResponseBuilder } from '../../request/response';
import type { Constructor } from '../../core/types';
import type {
  ExecutionContext,
  HttpArgumentsHost,
  WsArgumentsHost,
} from './types';

/**
 * HTTP 参数主机实现
 */
class HttpArgumentsHostImpl implements HttpArgumentsHost {
  public constructor(
    private readonly ctx: Context,
    private readonly responseBuilder?: ResponseBuilder,
  ) {}

  /**
   * 获取请求上下文
   */
  public getRequest(): Context {
    return this.ctx;
  }

  /**
   * 获取响应构建器
   */
  public getResponse(): ResponseBuilder | undefined {
    return this.responseBuilder;
  }
}

/**
 * WebSocket 参数主机实现
 */
class WsArgumentsHostImpl implements WsArgumentsHost {
  public constructor(
    private readonly client: ServerWebSocket<unknown>,
    private readonly data: unknown,
  ) {}

  /**
   * 获取 WebSocket 客户端
   */
  public getClient(): ServerWebSocket<unknown> {
    return this.client;
  }

  /**
   * 获取消息数据
   */
  public getData(): unknown {
    return this.data;
  }
}

/**
 * 执行上下文实现
 */
export class ExecutionContextImpl implements ExecutionContext {
  private readonly httpHost: HttpArgumentsHost;
  private wsHost?: WsArgumentsHost;

  public constructor(
    private readonly ctx: Context,
    private readonly controllerClass: Constructor<unknown>,
    private readonly methodName: string,
    private readonly handler: Function,
    private readonly args: unknown[] = [],
    responseBuilder?: ResponseBuilder,
  ) {
    this.httpHost = new HttpArgumentsHostImpl(ctx, responseBuilder);
  }

  /**
   * 设置 WebSocket 上下文
   * @param client - WebSocket 客户端
   * @param data - 消息数据
   */
  public setWsContext(client: ServerWebSocket<unknown>, data: unknown): void {
    this.wsHost = new WsArgumentsHostImpl(client, data);
  }

  /**
   * 获取 HTTP 上下文
   */
  public switchToHttp(): HttpArgumentsHost {
    return this.httpHost;
  }

  /**
   * 获取 WebSocket 上下文
   */
  public switchToWs(): WsArgumentsHost {
    if (!this.wsHost) {
      throw new Error('WebSocket context is not available');
    }
    return this.wsHost;
  }

  /**
   * 获取当前处理的控制器类
   */
  public getClass(): Constructor<unknown> {
    return this.controllerClass;
  }

  /**
   * 获取当前处理的方法
   */
  public getHandler(): Function {
    return this.handler;
  }

  /**
   * 获取方法名
   */
  public getMethodName(): string {
    return this.methodName;
  }

  /**
   * 获取方法或类的元数据
   * @param key - 元数据键
   * @returns 元数据值
   */
  public getMetadata<T>(key: string | symbol): T | undefined {
    // 先尝试从方法获取
    const methodMetadata = Reflect.getMetadata(
      key,
      this.controllerClass.prototype,
      this.methodName,
    );
    if (methodMetadata !== undefined) {
      return methodMetadata as T;
    }

    // 如果方法没有，尝试从类获取
    return Reflect.getMetadata(key, this.controllerClass) as T | undefined;
  }

  /**
   * 获取请求参数
   */
  public getArgs(): unknown[] {
    return this.args;
  }
}

