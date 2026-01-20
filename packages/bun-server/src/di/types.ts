import type { Constructor } from '@/core/types'

/**
 * 实例后处理器接口
 * 用于在 DI 容器创建实例后进行处理（如创建代理、注入额外依赖等）
 */
export interface InstancePostProcessor {
  /**
   * 处理新创建的实例
   * @param instance - 原始实例
   * @param constructor - 构造函数
   * @param container - DI 容器引用
   * @returns 处理后的实例（可以是代理）
   */
  postProcess<T>(
    instance: T,
    constructor: Constructor<T>,
    container: unknown,
  ): T;

  /**
   * 优先级（数字越小优先级越高，默认 100）
   */
  priority?: number;
}

/**
 * 实例后处理器注册表 Token
 */
export const INSTANCE_POST_PROCESSOR_TOKEN = Symbol('@dangao/bun-server:di:post-processor');

/**
 * 依赖生命周期类型
 */
export enum Lifecycle {
  /**
   * 单例：整个应用生命周期中只有一个实例
   */
  Singleton = 'singleton',

  /**
   * 瞬态：每次请求都创建新实例
   */
  Transient = 'transient',

  /**
   * 作用域：在特定作用域内共享实例（未来扩展）
   */
  Scoped = 'scoped',
}

/**
 * 提供者配置
 */
export interface ProviderConfig {
  /**
   * 生命周期
   */
  lifecycle?: Lifecycle;

  /**
   * 自定义工厂函数
   */
  factory?: () => unknown;

  /**
   * 提供者标识符（用于接口注入）
   */
  token?: string | symbol;

  /**
   * 实际实现类（当 token 为 string/symbol 时用于实例化）
   */
  implementation?: new (...args: unknown[]) => unknown;
}

/**
 * 依赖元数据
 */
export interface DependencyMetadata {
  /**
   * 参数索引
   */
  index: number;

  /**
   * 依赖类型（构造函数）
   */
  type: Constructor<unknown> | string;

  /**
   * 可选的 token（用于接口注入）
   */
  token?: string | symbol;
}

