import type { Constructor } from '@/core/types'

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

