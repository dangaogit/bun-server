import 'reflect-metadata';

const GATEWAY_METADATA_KEY = Symbol('websocket:gateway');
const HANDLER_METADATA_KEY = Symbol('websocket:handlers');

export interface WebSocketGatewayMetadata {
  path: string;
}

export interface WebSocketHandlerMetadata {
  open?: string;
  message?: string;
  close?: string;
}

export function WebSocketGateway(path: string): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(GATEWAY_METADATA_KEY, { path }, target);
  };
}

function createHandlerDecorator(type: keyof WebSocketHandlerMetadata): MethodDecorator {
  return function (target, propertyKey) {
    if (typeof propertyKey !== 'string') {
      throw new Error('@OnOpen/@OnMessage/@OnClose only support string method names');
    }
    const existing =
      (Reflect.getMetadata(HANDLER_METADATA_KEY, target) as WebSocketHandlerMetadata | undefined) ||
      {};
    existing[type] = propertyKey;
    Reflect.defineMetadata(HANDLER_METADATA_KEY, existing, target);
  };
}

export const OnOpen = createHandlerDecorator('open');
export const OnMessage = createHandlerDecorator('message');
export const OnClose = createHandlerDecorator('close');

export function getGatewayMetadata(
  constructor: new (...args: unknown[]) => unknown,
): WebSocketGatewayMetadata | undefined {
  return Reflect.getMetadata(GATEWAY_METADATA_KEY, constructor);
}

export function getHandlerMetadata(target: object): WebSocketHandlerMetadata {
  return (
    (Reflect.getMetadata(HANDLER_METADATA_KEY, target) as WebSocketHandlerMetadata | undefined) || {}
  );
}


