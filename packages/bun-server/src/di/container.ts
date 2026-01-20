import "reflect-metadata";
import {
  type DependencyMetadata,
  type InstancePostProcessor,
  INSTANCE_POST_PROCESSOR_TOKEN,
  Lifecycle,
  type ProviderConfig,
} from "./types";
import {
  getDependencyMetadata,
  getLifecycle,
  getTypeReference,
} from "./decorators";
import { LoggerManager } from "@dangao/logsmith";
import type { Constructor } from "@/core/types";
import { contextStore } from "../core/context-service";

/**
 * 依赖注入容器
 * 管理依赖的注册、解析和生命周期
 */
interface ContainerOptions {
  parent?: Container;
}

export class Container {
  private readonly parent?: Container;

  public constructor(options: ContainerOptions = {}) {
    this.parent = options.parent;
  }
  /**
   * 注册的提供者
   */
  private readonly providers = new Map<string | symbol, ProviderConfig>();

  /**
   * 单例实例缓存
   */
  private readonly singletons = new Map<string | symbol, unknown>();

  /**
   * 请求作用域实例缓存（使用 WeakMap 存储，key 为 Context）
   * 每个请求都有独立的实例映射
   */
  private readonly scopedInstances = new WeakMap<object, Map<string | symbol, unknown>>();

  /**
   * 类型到 token 的映射（用于接口注入）
   */
  private readonly typeToToken = new Map<
    Constructor<unknown>,
    string | symbol
  >();

  /**
   * 依赖计划缓存，避免重复解析反射元数据
   */
  private readonly dependencyPlans = new Map<
    Constructor<unknown>,
    DependencyPlan
  >();

  /**
   * 实例后处理器列表
   */
  private readonly postProcessors: InstancePostProcessor[] = [];

  /**
   * 注册提供者
   * @param token - 提供者标识符（类构造函数或 token）
   * @param config - 提供者配置
   */
  public register<T>(
    token: Constructor<T> | string | symbol,
    config?: ProviderConfig,
  ): void {
    const tokenKey = this.getTokenKey(token);

    // 如果配置中没有指定生命周期，尝试从装饰器元数据获取
    let lifecycle = config?.lifecycle;
    if (!lifecycle && typeof token === "function") {
      lifecycle = getLifecycle(token);
    }

    const providerConfig: ProviderConfig = {
      lifecycle: lifecycle || Lifecycle.Singleton,
      ...config,
    };

    if (
      typeof token === "function" && !providerConfig.factory &&
      !providerConfig.implementation
    ) {
      providerConfig.implementation = token;
    }

    this.providers.set(tokenKey, providerConfig);

    // 如果是类构造函数，建立类型到 token 的映射
    if (typeof token === "function") {
      this.typeToToken.set(token, tokenKey);
    }
  }

  /**
   * 注册单例
   * @param token - 提供者标识符
   * @param instance - 实例对象
   */
  public registerInstance<T>(
    token: Constructor<T> | string | symbol,
    instance: T,
  ): void {
    const tokenKey = this.getTokenKey(token);
    this.singletons.set(tokenKey, instance);
    this.providers.set(tokenKey, {
      lifecycle: Lifecycle.Singleton,
    });
  }

  /**
   * 注册实例后处理器
   * @param processor - 后处理器实例
   */
  public registerPostProcessor(processor: InstancePostProcessor): void {
    this.postProcessors.push(processor);
    // 按优先级排序（数字越小优先级越高）
    this.postProcessors.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  /**
   * 应用所有后处理器（包括父容器的后处理器）
   * @param instance - 原始实例
   * @param constructor - 构造函数
   * @param originContainer - 原始调用容器（用于后处理器解析依赖）
   * @returns 处理后的实例
   */
  private applyPostProcessors<T>(
    instance: T,
    constructor: Constructor<T>,
    originContainer?: Container,
  ): T {
    // 使用原始容器或当前容器
    const containerForProcessors = originContainer ?? this;
    let result = instance;

    // 先应用父容器的后处理器
    if (this.parent) {
      result = (this.parent as Container).applyPostProcessors(result, constructor, containerForProcessors);
    }

    // 再应用本容器的后处理器
    // 传递原始调用容器，而不是当前容器
    for (const processor of this.postProcessors) {
      result = processor.postProcess(result, constructor, containerForProcessors);
    }
    return result;
  }

  /**
   * 解析依赖
   * @param token - 提供者标识符
   * @returns 解析后的实例
   */
  public resolve<T>(token: Constructor<T> | string | symbol): T {
    const tokenKey = this.getTokenKey(token);
    const provider = this.providers.get(tokenKey);

    if (!provider) {
      if (this.parent) {
        return this.parent.resolve(token as Constructor<T>);
      }
      // 如果没有注册，尝试直接实例化（用于未注册的类）
      // 但只有在是构造函数时才允许
      if (typeof token === "function") {
        // 检查是否有参数，如果有参数则需要注册
        const paramTypes = Reflect.getMetadata(
          "design:paramtypes",
          token,
        ) as unknown[];
        if (paramTypes && paramTypes.length > 0) {
          // 有依赖，必须先注册
          throw new Error(`Provider not found for token: ${String(tokenKey)}`);
        }
        // 无参数，可以直接实例化
        return new token() as T;
      }
      throw new Error(`Provider not found for token: ${String(tokenKey)}`);
    }

    // 检查单例缓存
    if (provider.lifecycle === Lifecycle.Singleton) {
      const singleton = this.singletons.get(tokenKey);
      if (singleton) {
        return singleton as T;
      }
    }

    // 检查请求作用域缓存
    if (provider.lifecycle === Lifecycle.Scoped) {
      const context = contextStore.getStore();
      if (context) {
        let scopedMap = this.scopedInstances.get(context);
        if (!scopedMap) {
          scopedMap = new Map();
          this.scopedInstances.set(context, scopedMap);
        }
        const scopedInstance = scopedMap.get(tokenKey);
        if (scopedInstance) {
          return scopedInstance as T;
        }
      }
    }

    // 使用工厂函数或实例化
    let instance: T;
    if (provider.factory) {
      instance = provider.factory() as T;
    } else if (typeof token === "function") {
      instance = this.instantiate(token as Constructor<T>);
    } else if (
      provider.implementation && typeof provider.implementation === "function"
    ) {
      instance = this.instantiate(provider.implementation as Constructor<T>);
    } else {
      throw new Error(
        `Cannot instantiate token: ${
          String(tokenKey)
        }. Factory function required.`,
      );
    }

    // 缓存单例
    if (provider.lifecycle === Lifecycle.Singleton) {
      this.singletons.set(tokenKey, instance);
    }

    // 缓存请求作用域实例
    if (provider.lifecycle === Lifecycle.Scoped) {
      const context = contextStore.getStore();
      if (context) {
        let scopedMap = this.scopedInstances.get(context);
        if (!scopedMap) {
          scopedMap = new Map();
          this.scopedInstances.set(context, scopedMap);
        }
        scopedMap.set(tokenKey, instance);
      }
    }

    return instance;
  }

  /**
   * 解析依赖（内部方法，支持 string | symbol token）
   * @param token - 提供者标识符
   * @returns 解析后的实例
   */
  private resolveInternal(
    token: Constructor<unknown> | string | symbol,
  ): unknown {
    // 调试：记录 token 的类型和值
    const tokenType = typeof token;
    const tokenString = String(token);
    const logger = LoggerManager.getLogger();

    // 调试：记录 token 信息
    if (
      tokenString.includes("Level2") || tokenString.includes("Dependency") ||
      tokenString.includes("Service")
    ) {
      logger.debug(
        `[DI Debug] resolveInternal: token=${tokenString}, tokenType=${tokenType}`,
      );
    }

    // 检查是否是 string 或 symbol
    // 注意：必须先检查 string/symbol，因为函数也是对象
    if (typeof token === "string" || typeof token === "symbol") {
      // 对于 string | symbol token，直接查找提供者
      const provider = this.providers.get(token);
      if (!provider) {
        if (this.parent) {
          return this.parent.resolveInternal(token);
        }
        throw new Error(`Provider not found for token: ${String(token)}`);
      }

      // 检查单例缓存
      if (provider.lifecycle === Lifecycle.Singleton) {
        const singleton = this.singletons.get(token);
        if (singleton) {
          return singleton;
        }
      }

      // 检查请求作用域缓存
      if (provider.lifecycle === Lifecycle.Scoped) {
        const context = contextStore.getStore();
        if (context) {
          let scopedMap = this.scopedInstances.get(context);
          if (!scopedMap) {
            scopedMap = new Map();
            this.scopedInstances.set(context, scopedMap);
          }
          const scopedInstance = scopedMap.get(token);
          if (scopedInstance) {
            return scopedInstance;
          }
        }
      }

      // 使用工厂函数或实现类
      let instance: unknown;
      if (provider.factory) {
        instance = provider.factory();
      } else if (
        provider.implementation && typeof provider.implementation === "function"
      ) {
        instance = this.instantiate(provider.implementation);
      } else {
        throw new Error(
          `Cannot instantiate token: ${
            String(token)
          }. Factory function required.`,
        );
      }

      // 缓存单例
      if (provider.lifecycle === Lifecycle.Singleton) {
        this.singletons.set(token, instance);
      }

      // 缓存请求作用域实例
      if (provider.lifecycle === Lifecycle.Scoped) {
        const context = contextStore.getStore();
        if (context) {
          let scopedMap = this.scopedInstances.get(context);
          if (!scopedMap) {
            scopedMap = new Map();
            this.scopedInstances.set(context, scopedMap);
          }
          scopedMap.set(token, instance);
        }
      }

      return instance;
    }

    // 对于构造函数类型，使用公共 resolve 方法
    // 确保 token 是函数类型
    if (typeof token === "function") {
      return this.resolve(token as new (...args: unknown[]) => unknown);
    }

    throw new Error(
      `Invalid token type: ${tokenType}. Token: ${String(token)}`,
    );
  }

  /**
   * 实例化类（自动注入依赖）
   * @param constructor - 构造函数
   * @returns 实例
   */
  private instantiate<T>(constructor: Constructor<T>): T {
    const plan = this.getDependencyPlan(constructor);

    let instance: T;
    if (plan.paramLength === 0) {
      instance = new constructor();
    } else {
      const dependencies = new Array(plan.paramLength);
      for (let index = 0; index < plan.paramLength; index++) {
        dependencies[index] = this.resolveFromPlan(constructor, plan, index);
      }
      instance = new constructor(...dependencies);
    }

    // 应用后处理器
    return this.applyPostProcessors(instance, constructor);
  }

  /**
   * 获取 token 键
   * @param token - 提供者标识符
   * @returns token 键
   */
  private getTokenKey(
    token: (new (...args: unknown[]) => unknown) | string | symbol,
  ): string | symbol {
    if (typeof token === "function") {
      return token.name || Symbol(token.toString());
    }
    return token;
  }

  /**
   * 清除所有注册（主要用于测试）
   * 注意：scopedInstances 使用 WeakMap，会自动清理，无需手动清除
   */
  public clear(): void {
    this.providers.clear();
    this.singletons.clear();
    this.typeToToken.clear();
    this.dependencyPlans.clear();
    this.postProcessors.length = 0;
    // scopedInstances 使用 WeakMap，当 Context 对象被 GC 时会自动清理
  }

  /**
   * 检查是否已注册
   * @param token - 提供者标识符
   * @returns 是否已注册
   */
  public isRegistered(token: Constructor<unknown> | string | symbol): boolean {
    const tokenKey = this.getTokenKey(token);
    return this.providers.has(tokenKey);
  }

  private getDependencyPlan(constructor: Constructor<unknown>): DependencyPlan {
    let plan = this.dependencyPlans.get(constructor);
    if (plan) {
      return plan;
    }

    const paramTypes =
      (Reflect.getMetadata(
        "design:paramtypes",
        constructor,
      ) as (Constructor<unknown> | undefined)[]) ?? [];
    const dependencyMetadata = getDependencyMetadata(constructor);
    const metadataMap = new Map<number, DependencyMetadata>();
    let paramLength = paramTypes.length;

    for (const meta of dependencyMetadata) {
      if (meta && typeof meta.index === "number") {
        metadataMap.set(meta.index, meta);
        if (meta.index + 1 > paramLength) {
          paramLength = meta.index + 1;
        }
      }
    }

    const resolvedTypes = new Map<number, Constructor<unknown>>();

    for (let i = 0; i < paramLength; i++) {
      const typeRef = getTypeReference(constructor, i);
      if (typeRef && typeof typeRef === "function") {
        resolvedTypes.set(i, typeRef as Constructor<unknown>);
      }
    }

    for (const [index, meta] of metadataMap.entries()) {
      const depType = meta?.type;
      if (typeof depType === "function") {
        resolvedTypes.set(index, depType as Constructor<unknown>);
      } else if (typeof depType === "string") {
        const globalType = (globalThis as Record<string, unknown>)[depType];
        if (typeof globalType === "function") {
          resolvedTypes.set(index, globalType as Constructor<unknown>);
        }
      }
    }

    plan = {
      paramTypes,
      metadataMap,
      resolvedTypes,
      paramLength,
    };
    this.dependencyPlans.set(constructor, plan);
    return plan;
  }

  private resolveFromPlan(
    constructor: Constructor<unknown>,
    plan: DependencyPlan,
    index: number,
  ): unknown {
    const meta = plan.metadataMap.get(index);
    if (meta?.token) {
      return this.resolveInternal(meta.token);
    }

    const resolvedType = plan.resolvedTypes.get(index);
    if (resolvedType) {
      return this.resolveInternal(resolvedType);
    }

    const paramType = plan.paramTypes[index];
    if (paramType) {
      const token = this.typeToToken.get(paramType);
      if (token) {
        return this.resolveInternal(token);
      }
      return this.resolveInternal(paramType);
    }

    throw new Error(
      `Cannot resolve dependency at index ${index} of ${constructor.name}. ` +
        "Parameter type is undefined. Use @Inject() decorator to specify the dependency type.",
    );
  }
}

interface DependencyPlan {
  paramTypes: (Constructor<unknown> | undefined)[];
  metadataMap: Map<number, DependencyMetadata>;
  resolvedTypes: Map<number, Constructor<unknown>>;
  paramLength: number;
}
