import 'reflect-metadata';

import type { Constructor } from '../core/types';

export const IDLE_TIMEOUT_KEY = Symbol('@dangao/bun-server:route:idle-timeout');

export function IdleTimeout(ms: number): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol) => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(IDLE_TIMEOUT_KEY, ms, target, propertyKey);
      return;
    }
    Reflect.defineMetadata(IDLE_TIMEOUT_KEY, ms, target);
  };
}

export function getIdleTimeout(
  controllerClass: Constructor<unknown>,
  methodName: string,
): number | undefined {
  const methodTimeout = Reflect.getMetadata(
    IDLE_TIMEOUT_KEY,
    controllerClass.prototype,
    methodName,
  ) as number | undefined;
  if (typeof methodTimeout === 'number') {
    return methodTimeout;
  }
  const classTimeout = Reflect.getMetadata(
    IDLE_TIMEOUT_KEY,
    controllerClass,
  ) as number | undefined;
  return typeof classTimeout === 'number' ? classTimeout : undefined;
}

