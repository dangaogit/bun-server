/**
 * 模块初始化钩子
 * 在模块所有 providers 注册完成后调用
 */
export interface OnModuleInit {
  onModuleInit(): Promise<void> | void;
}

/**
 * 模块销毁钩子
 * 在应用关闭时调用（反向顺序）
 */
export interface OnModuleDestroy {
  onModuleDestroy(): Promise<void> | void;
}

/**
 * 应用启动钩子
 * 在所有模块初始化完成后、服务器开始监听前调用
 */
export interface OnApplicationBootstrap {
  onApplicationBootstrap(): Promise<void> | void;
}

/**
 * 应用关闭钩子
 * 在优雅停机开始时调用
 */
export interface OnApplicationShutdown {
  onApplicationShutdown(signal?: string): Promise<void> | void;
}

/**
 * 组件创建前钩子（静态类方法）
 * 在实例化前调用，适用于 Controller / Injectable 类
 */
export type ComponentClassBeforeCreate = {
  onBeforeCreate(): void;
};

/**
 * 组件创建后钩子（实例）
 * 在实例化并完成后处理后调用
 */
export interface OnAfterCreate {
  onAfterCreate(): void;
}

/**
 * 组件销毁前钩子（实例）
 * 在 onModuleDestroy 之前调用（反向顺序）
 */
export interface OnBeforeDestroy {
  onBeforeDestroy(): Promise<void> | void;
}

/**
 * 组件销毁后钩子（实例）
 * 在 onModuleDestroy 之后调用（反向顺序）
 */
export interface OnAfterDestroy {
  onAfterDestroy(): Promise<void> | void;
}

export function hasOnModuleInit(instance: unknown): instance is OnModuleInit {
  return (
    instance !== null &&
    instance !== undefined &&
    typeof instance === 'object' &&
    'onModuleInit' in instance &&
    typeof (instance as OnModuleInit).onModuleInit === 'function'
  );
}

export function hasOnModuleDestroy(instance: unknown): instance is OnModuleDestroy {
  return (
    instance !== null &&
    instance !== undefined &&
    typeof instance === 'object' &&
    'onModuleDestroy' in instance &&
    typeof (instance as OnModuleDestroy).onModuleDestroy === 'function'
  );
}

export function hasOnApplicationBootstrap(instance: unknown): instance is OnApplicationBootstrap {
  return (
    instance !== null &&
    instance !== undefined &&
    typeof instance === 'object' &&
    'onApplicationBootstrap' in instance &&
    typeof (instance as OnApplicationBootstrap).onApplicationBootstrap === 'function'
  );
}

export function hasOnApplicationShutdown(instance: unknown): instance is OnApplicationShutdown {
  return (
    instance !== null &&
    instance !== undefined &&
    typeof instance === 'object' &&
    'onApplicationShutdown' in instance &&
    typeof (instance as OnApplicationShutdown).onApplicationShutdown === 'function'
  );
}

export function hasComponentBeforeCreate(target: unknown): target is ComponentClassBeforeCreate {
  return (
    target !== null &&
    target !== undefined &&
    typeof target === 'function' &&
    'onBeforeCreate' in target &&
    typeof (target as ComponentClassBeforeCreate).onBeforeCreate === 'function'
  );
}

export function hasOnAfterCreate(instance: unknown): instance is OnAfterCreate {
  return (
    instance !== null &&
    instance !== undefined &&
    typeof instance === 'object' &&
    'onAfterCreate' in instance &&
    typeof (instance as OnAfterCreate).onAfterCreate === 'function'
  );
}

export function hasOnBeforeDestroy(instance: unknown): instance is OnBeforeDestroy {
  return (
    instance !== null &&
    instance !== undefined &&
    typeof instance === 'object' &&
    'onBeforeDestroy' in instance &&
    typeof (instance as OnBeforeDestroy).onBeforeDestroy === 'function'
  );
}

export function hasOnAfterDestroy(instance: unknown): instance is OnAfterDestroy {
  return (
    instance !== null &&
    instance !== undefined &&
    typeof instance === 'object' &&
    'onAfterDestroy' in instance &&
    typeof (instance as OnAfterDestroy).onAfterDestroy === 'function'
  );
}

/**
 * 调用组件类静态 onBeforeCreate
 */
export function callComponentBeforeCreate(target: unknown): void {
  if (hasComponentBeforeCreate(target)) {
    target.onBeforeCreate();
  }
}

/**
 * 调用组件实例 onAfterCreate
 */
export function callOnAfterCreate(instance: unknown): void {
  if (hasOnAfterCreate(instance)) {
    instance.onAfterCreate();
  }
}

/**
 * 按顺序调用 onModuleInit
 */
export async function callOnModuleInit(instances: unknown[]): Promise<void> {
  for (const instance of instances) {
    if (hasOnModuleInit(instance)) {
      await instance.onModuleInit();
    }
  }
}

/**
 * 按顺序调用 onApplicationBootstrap
 */
export async function callOnApplicationBootstrap(instances: unknown[]): Promise<void> {
  for (const instance of instances) {
    if (hasOnApplicationBootstrap(instance)) {
      await instance.onApplicationBootstrap();
    }
  }
}

/**
 * 按反向顺序调用 onModuleDestroy
 */
export async function callOnModuleDestroy(instances: unknown[]): Promise<void> {
  for (let i = instances.length - 1; i >= 0; i--) {
    const instance = instances[i];
    if (hasOnModuleDestroy(instance)) {
      await instance.onModuleDestroy();
    }
  }
}

/**
 * 按反向顺序调用 onApplicationShutdown
 */
export async function callOnApplicationShutdown(instances: unknown[], signal?: string): Promise<void> {
  for (let i = instances.length - 1; i >= 0; i--) {
    const instance = instances[i];
    if (hasOnApplicationShutdown(instance)) {
      await instance.onApplicationShutdown(signal);
    }
  }
}

/**
 * 按反向顺序调用 onBeforeDestroy
 */
export async function callOnBeforeDestroy(instances: unknown[]): Promise<void> {
  for (let i = instances.length - 1; i >= 0; i--) {
    const instance = instances[i];
    if (hasOnBeforeDestroy(instance)) {
      await instance.onBeforeDestroy();
    }
  }
}

/**
 * 按反向顺序调用 onAfterDestroy
 */
export async function callOnAfterDestroy(instances: unknown[]): Promise<void> {
  for (let i = instances.length - 1; i >= 0; i--) {
    const instance = instances[i];
    if (hasOnAfterDestroy(instance)) {
      await instance.onAfterDestroy();
    }
  }
}
