import type { ServerWebSocket } from 'bun';

import { Container } from '../di/container';
import { ControllerRegistry } from '../controller/controller';
import { getGatewayMetadata, getHandlerMetadata } from './decorators';
import { ParamBinder } from '../controller/param-binder';
import { getParamMetadata } from '../controller/decorators';
import { Context } from '../core/context';
import type { Constructor } from '@/core/types';

interface GatewayDefinition {
  path: string;
  gatewayClass: Constructor<unknown>;
  handlers: {
    open?: string;
    message?: string;
    close?: string;
  };
}

export interface WebSocketConnectionData {
  path: string;
  query?: URLSearchParams;
  context?: Context;
}

export class WebSocketGatewayRegistry {
  private static instance: WebSocketGatewayRegistry;
  private readonly container: Container;
  private readonly gateways = new Map<string, GatewayDefinition>();

  private constructor() {
    this.container = ControllerRegistry.getInstance().getContainer();
  }

  public static getInstance(): WebSocketGatewayRegistry {
    if (!WebSocketGatewayRegistry.instance) {
      WebSocketGatewayRegistry.instance = new WebSocketGatewayRegistry();
    }
    return WebSocketGatewayRegistry.instance;
  }

  public register(gatewayClass: Constructor<unknown>): void {
    const metadata = getGatewayMetadata(gatewayClass);
    if (!metadata) {
      throw new Error(`WebSocket gateway ${gatewayClass.name} must use @WebSocketGateway()`);
    }

    const handlers = getHandlerMetadata(gatewayClass.prototype);
    if (!handlers.open && !handlers.message && !handlers.close) {
      throw new Error(`WebSocket gateway ${gatewayClass.name} must define at least one handler`);
    }

    if (!this.container.isRegistered(gatewayClass)) {
      this.container.register(gatewayClass);
    }

    this.gateways.set(metadata.path, {
      path: metadata.path,
      gatewayClass,
      handlers,
    });
  }

  public hasGateway(path: string): boolean {
    return this.gateways.has(path);
  }

  public clear(): void {
    this.gateways.clear();
  }

  private getGateway(path: string): GatewayDefinition | undefined {
    return this.gateways.get(path);
  }

  /**
   * 动态创建网关实例（每次连接创建新实例）
   * @param definition - 网关定义
   * @returns 网关实例
   */
  private createGatewayInstance(definition: GatewayDefinition): unknown {
    return this.container.resolve(definition.gatewayClass);
  }

  /**
   * 调用处理器，支持参数绑定
   * @param ws - WebSocket 连接
   * @param definition - 网关定义
   * @param handlerName - 处理器方法名
   * @param args - 原始参数（message, code, reason 等，不包括 ws）
   */
  private async invokeHandler(
    ws: ServerWebSocket<WebSocketConnectionData>,
    definition: GatewayDefinition,
    handlerName: string | undefined,
    ...args: unknown[]
  ): Promise<void> {
    if (!handlerName) {
      return;
    }

    // 动态创建实例（每次连接创建新实例）
    const instance = this.createGatewayInstance(definition);
    const handler = (instance as Record<string, unknown>)[handlerName];

    if (typeof handler !== 'function') {
      return;
    }

    // 获取参数元数据
    const prototype = definition.gatewayClass.prototype;
    const paramMetadata = getParamMetadata(prototype, handlerName);

    // 如果有参数装饰器，使用参数绑定
    if (paramMetadata.length > 0) {
      // 创建或获取 Context
      let context = ws.data?.context;
      if (!context) {
        // 从 WebSocket 连接数据创建 Context
        const url = new URL(ws.data.path || '/', 'http://localhost');
        if (ws.data.query) {
          ws.data.query.forEach((value, key) => {
            url.searchParams.set(key, value);
          });
        }
        const request = new Request(url.toString(), {
          method: 'GET',
          headers: new Headers(),
        });
        context = new Context(request);
        ws.data.context = context;
      }

      // 使用 ParamBinder 绑定参数
      const boundParams = await ParamBinder.bind(
        prototype,
        handlerName,
        context,
        this.container,
      );

      // 构建最终参数数组
      // WebSocket 处理器的参数顺序：ws, [message/code/reason], [装饰器参数...]
      const finalArgs: unknown[] = [];
      const maxParamIndex = paramMetadata.length > 0
        ? Math.max(...paramMetadata.map((m) => m.index))
        : -1;

      // 按方法签名顺序填充参数
      // 首先确定方法的总参数数量（包括 ws 和原始参数）
      const totalParamCount = Math.max(
        maxParamIndex + 1,
        args.length + 1, // +1 是 ws 参数
      );

      for (let i = 0; i < totalParamCount; i++) {
        const meta = paramMetadata.find((m) => m.index === i);
        if (meta) {
          // 使用绑定参数（从 ParamBinder 获取）
          finalArgs[i] = boundParams[i];
        } else if (i === 0) {
          // 第一个参数是 ws
          finalArgs[i] = ws;
        } else {
          // 其他参数是原始参数（message, code, reason 等）
          const argIndex = i - 1;
          if (argIndex < args.length) {
            finalArgs[i] = args[argIndex];
          } else {
            finalArgs[i] = undefined;
          }
        }
      }

      // 如果方法签名参数少于实际参数，添加剩余参数
      if (args.length > maxParamIndex) {
        for (let i = maxParamIndex + 1; i < args.length; i++) {
          finalArgs.push(args[i]);
        }
      }

      handler.apply(instance, finalArgs);
    } else {
      // 没有参数装饰器，直接调用：ws, ...args
      handler.apply(instance, [ws, ...args]);
    }
  }

  public async handleOpen(ws: ServerWebSocket<WebSocketConnectionData>): Promise<void> {
    const path = ws.data?.path;
    const definition = path ? this.getGateway(path) : undefined;
    if (!definition) {
      ws.close(1008, 'Gateway not found');
      return;
    }
    await this.invokeHandler(ws, definition, definition.handlers.open);
  }

  public async handleMessage(
    ws: ServerWebSocket<WebSocketConnectionData>,
    message: string | ArrayBuffer | ArrayBufferView,
  ): Promise<void> {
    const path = ws.data?.path;
    const definition = path ? this.getGateway(path) : undefined;
    if (!definition) {
      ws.close(1008, 'Gateway not found');
      return;
    }
    await this.invokeHandler(ws, definition, definition.handlers.message, message);
  }

  public async handleClose(
    ws: ServerWebSocket<WebSocketConnectionData>,
    code: number,
    reason: string,
  ): Promise<void> {
    const path = ws.data?.path;
    const definition = path ? this.getGateway(path) : undefined;
    if (!definition) {
      return;
    }
    await this.invokeHandler(ws, definition, definition.handlers.close, code, reason);
  }
}


