import 'reflect-metadata';

import type { Constructor } from '@/core/types';
import type { Container } from './container';
import type { Lifecycle } from './types';

export type ModuleClass<T = unknown> = Constructor<T>;
export type ProviderToken = Constructor<unknown> | string | symbol;

export interface ClassProvider {
  provide?: ProviderToken;
  useClass: Constructor<unknown>;
  lifecycle?: Lifecycle;
}

export interface ValueProvider {
  provide: ProviderToken;
  useValue: unknown;
}

export interface FactoryProvider {
  provide: ProviderToken;
  useFactory: (container: Container) => unknown;
  lifecycle?: Lifecycle;
}

export type ModuleProvider = Constructor<unknown> | ClassProvider | ValueProvider | FactoryProvider;

export interface ModuleMetadata {
  imports?: ModuleClass[];
  controllers?: Constructor<unknown>[];
  providers?: ModuleProvider[];
  exports?: ProviderToken[];
}

const MODULE_METADATA_KEY = Symbol('@dangao/bun-server:module');

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, target);
  };
}

export function getModuleMetadata(moduleClass: ModuleClass): Required<ModuleMetadata> {
  const metadata = (Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass) as ModuleMetadata | undefined) ?? {};
  return {
    imports: metadata.imports ?? [],
    controllers: metadata.controllers ?? [],
    providers: metadata.providers ?? [],
    exports: metadata.exports ?? [],
  };
}

