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
  pattern: RegExp;
  paramNames: string[];
  isStatic: boolean;
}

export interface WebSocketConnectionData {
  path: string;
  query?: URLSearchParams;
  context?: Context;
  params?: Record<string, string>;
}

export class WebSocketGatewayRegistry {
  private static instance: WebSocketGatewayRegistry;
  private readonly container: Container;
  private readonly gateways = new Map<string, GatewayDefinition>();
  private readonly staticGateways = new Map<string, GatewayDefinition>();
  private readonly dynamicGateways: GatewayDefinition[] = [];

  private constructor() {
    this.container = ControllerRegistry.getInstance().getContainer();
  }

  public static getInstance(): WebSocketGatewayRegistry {
    if (!WebSocketGatewayRegistry.instance) {
      WebSocketGatewayRegistry.instance = new WebSocketGatewayRegistry();
    }
    return WebSocketGatewayRegistry.instance;
  }

  /**
   * 解析路径，生成匹配模式和参数名列表
   * @param path - 路由路径
   * @returns 匹配模式和参数名列表
   */
  private parsePath(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const patternString = path
      .replace(/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      })
      .replace(/\*/g, '.*');

    const pattern = new RegExp(`^${patternString}$`);
    return { pattern, paramNames };
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

    // 解析路径
    const { pattern, paramNames } = this.parsePath(metadata.path);
    const isStatic = !metadata.path.includes(':') && !metadata.path.includes('*');

    const definition: GatewayDefinition = {
      path: metadata.path,
      gatewayClass,
      handlers,
      pattern,
      paramNames,
      isStatic,
    };

    this.gateways.set(metadata.path, definition);

    // 分别存储静态和动态路由
    if (isStatic) {
      this.staticGateways.set(metadata.path, definition);
    } else {
      this.dynamicGateways.push(definition);
    }
  }

  /**
   * 检查是否有匹配的网关（支持动态路径匹配）
   * @param path - 请求路径
   * @returns 是否有匹配的网关
   */
  public hasGateway(path: string): boolean {
    // 先检查静态路由
    if (this.staticGateways.has(path)) {
      return true;
    }

    // 遍历动态路由
    for (const gateway of this.dynamicGateways) {
      if (gateway.pattern.test(path)) {
        return true;
      }
    }

    return false;
  }

  public clear(): void {
    this.gateways.clear();
    this.staticGateways.clear();
    this.dynamicGateways.length = 0;
  }

  /**
   * 获取匹配的网关（支持动态路径匹配）
   * @param path - 请求路径
   * @returns 匹配的网关定义和路径参数
   */
  private getGateway(path: string): { definition: GatewayDefinition; params: Record<string, string> } | undefined {
    // 先检查静态路由
    const staticGateway = this.staticGateways.get(path);
    if (staticGateway) {
      return { definition: staticGateway, params: {} };
    }

    // 遍历动态路由
    for (const gateway of this.dynamicGateways) {
      const match = path.match(gateway.pattern);
      if (match) {
        // 提取路径参数
        const params: Record<string, string> = {};
        for (let i = 0; i < gateway.paramNames.length; i++) {
          params[gateway.paramNames[i]] = match[i + 1] ?? '';
        }
        return { definition: gateway, params };
      }
    }

    return undefined;
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
        // 设置路径参数到 Context
        if (ws.data.params) {
          context.params = ws.data.params;
        }
        ws.data.context = context;
      } else {
        // 如果 Context 已存在，更新路径参数
        if (ws.data.params) {
          context.params = ws.data.params;
        }
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
    const match = path ? this.getGateway(path) : undefined;
    if (!match) {
      ws.close(1008, 'Gateway not found');
      return;
    }
    // 保存路径参数到 WebSocket 连接数据
    if (match.params && Object.keys(match.params).length > 0) {
      ws.data.params = match.params;
    }
    await this.invokeHandler(ws, match.definition, match.definition.handlers.open);
  }

  public async handleMessage(
    ws: ServerWebSocket<WebSocketConnectionData>,
    message: string | ArrayBuffer | ArrayBufferView,
  ): Promise<void> {
    const path = ws.data?.path;
    const match = path ? this.getGateway(path) : undefined;
    if (!match) {
      ws.close(1008, 'Gateway not found');
      return;
    }
    // 保存路径参数到 WebSocket 连接数据（如果还没有）
    if (match.params && Object.keys(match.params).length > 0 && !ws.data.params) {
      ws.data.params = match.params;
    }
    await this.invokeHandler(ws, match.definition, match.definition.handlers.message, message);
  }

  public async handleClose(
    ws: ServerWebSocket<WebSocketConnectionData>,
    code: number,
    reason: string,
  ): Promise<void> {
    const path = ws.data?.path;
    const match = path ? this.getGateway(path) : undefined;
    if (!match) {
      return;
    }
    await this.invokeHandler(ws, match.definition, match.definition.handlers.close, code, reason);
  }
}


