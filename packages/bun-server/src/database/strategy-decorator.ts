import 'reflect-metadata';

import type { Constructor } from '@/core/types';

export const DB_STRATEGY_KEY = Symbol('@dangao/bun-server:database:strategy');

export type DbStrategyType = 'pool' | 'session';

export function DbStrategy(
  strategy: DbStrategyType,
): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol) => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(DB_STRATEGY_KEY, strategy, target, propertyKey);
      return;
    }
    Reflect.defineMetadata(DB_STRATEGY_KEY, strategy, target);
  };
}

export function Session(): MethodDecorator & ClassDecorator {
  return DbStrategy('session');
}

export function getDbStrategy(
  controllerClass: Constructor<unknown>,
  methodName: string,
): DbStrategyType | undefined {
  const methodStrategy = Reflect.getMetadata(
    DB_STRATEGY_KEY,
    controllerClass.prototype,
    methodName,
  ) as DbStrategyType | undefined;
  if (methodStrategy) {
    return methodStrategy;
  }
  return Reflect.getMetadata(
    DB_STRATEGY_KEY,
    controllerClass,
  ) as DbStrategyType | undefined;
}

