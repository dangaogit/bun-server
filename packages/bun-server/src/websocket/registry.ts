import type { ServerWebSocket } from 'bun';

import { Container } from '../di/container';
import { ControllerRegistry } from '../controller/controller';
import { getGatewayMetadata, getHandlerMetadata } from './decorators';
import type { Constructor } from '@/core/types'

interface GatewayDefinition {
  path: string;
  gatewayClass: Constructor<unknown>;
  handlers: {
    open?: string;
    message?: string;
    close?: string;
  };
  instance?: unknown;
}

export interface WebSocketConnectionData {
  path: string;
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

  private getGatewayInstance(definition: GatewayDefinition): unknown {
    if (!definition.instance) {
      definition.instance = this.container.resolve(definition.gatewayClass);
    }
    return definition.instance;
  }

  private invokeHandler(
    ws: ServerWebSocket<WebSocketConnectionData>,
    definition: GatewayDefinition,
    handlerName: string | undefined,
    ...args: unknown[]
  ): void {
    if (!handlerName) {
      return;
    }
    const instance = this.getGatewayInstance(definition);
    const handler = (instance as Record<string, unknown>)[handlerName];
    if (typeof handler === 'function') {
      handler.apply(instance, [ws, ...args]);
    }
  }

  public handleOpen(ws: ServerWebSocket<WebSocketConnectionData>): void {
    const path = ws.data?.path;
    const definition = path ? this.getGateway(path) : undefined;
    if (!definition) {
      ws.close(1008, 'Gateway not found');
      return;
    }
    this.invokeHandler(ws, definition, definition.handlers.open);
  }

  public handleMessage(
    ws: ServerWebSocket<WebSocketConnectionData>,
    message: string | ArrayBuffer | ArrayBufferView,
  ): void {
    const path = ws.data?.path;
    const definition = path ? this.getGateway(path) : undefined;
    if (!definition) {
      ws.close(1008, 'Gateway not found');
      return;
    }
    this.invokeHandler(ws, definition, definition.handlers.message, message);
  }

  public handleClose(
    ws: ServerWebSocket<WebSocketConnectionData>,
    code: number,
    reason: string,
  ): void {
    const path = ws.data?.path;
    const definition = path ? this.getGateway(path) : undefined;
    if (!definition) {
      return;
    }
    this.invokeHandler(ws, definition, definition.handlers.close, code, reason);
  }
}


