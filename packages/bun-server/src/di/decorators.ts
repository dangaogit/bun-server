import "reflect-metadata";
import { type DependencyMetadata, Lifecycle } from "./types";
import { LoggerManager } from "@dangao/logsmith";
import type { Constructor } from "@/core/types";

/**
 * 依赖元数据键
 */
const DEPENDENCY_METADATA_KEY = Symbol("dependency:metadata");
const INJECTABLE_METADATA_KEY = Symbol("injectable");

/**
 * 类型引用映射（用于保存构造函数类型，避免 Reflect.defineMetadata 序列化问题）
 */
const typeReferenceMap = new WeakMap<
  Constructor<unknown>,
  Map<string, Constructor<unknown>>
>();

/**
 * Injectable 装饰器
 * 标记类为可注入的
 * @param config - 提供者配置
 */
export function Injectable(
  config?: { lifecycle?: Lifecycle },
): (target: Constructor<unknown>) => void {
  return function (target: new (...args: unknown[]) => unknown) {
    // 保存可注入标记
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, true, target);
    // 保存生命周期配置
    if (config?.lifecycle) {
      Reflect.defineMetadata("lifecycle", config.lifecycle, target);
    }
  };
}

/**
 * Inject 装饰器
 * 标记需要注入的依赖
 * @param token - 依赖标识符（可选，默认使用参数类型）
 */
export function Inject(
  token?: Constructor<unknown> | string | symbol,
): ParameterDecorator {
  return function (
    target: unknown,
    _propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    const logger = LoggerManager.getLogger();

    // 参数装饰器的 target 可能是构造函数本身（用于构造函数参数）
    // 也可能是类的原型（用于方法参数）
    const constructor = typeof target === "function"
      ? (target as Constructor<unknown>)
      : (target as any)?.constructor;
    if (!constructor) {
      return;
    }

    // 获取参数类型（从构造函数获取）
    const paramTypes = Reflect.getMetadata(
      "design:paramtypes",
      constructor,
    ) as Constructor<unknown>[];
    const paramType = paramTypes?.[parameterIndex];

    // 获取或创建依赖元数据（保存在构造函数上）
    let metadata: DependencyMetadata[] =
      Reflect.getMetadata(DEPENDENCY_METADATA_KEY, constructor) || [];

    // 确保数组有足够的长度
    const paramCount = paramTypes?.length || 0;
    while (metadata.length < paramCount) {
      metadata.push(undefined as unknown as DependencyMetadata);
    }

    // 确定依赖类型
    let dependencyType: Constructor<unknown>;
    let dependencyToken: string | symbol | undefined;

    if (token) {
      if (typeof token === "string" || typeof token === "symbol") {
        dependencyToken = token;
        // 如果没有参数类型，使用 Object 作为占位符
        dependencyType = paramType || (Object as Constructor<unknown>);
      } else {
        dependencyType = token;
      }
    } else {
      // 如果没有提供 token，使用参数类型
      // 如果 paramType 是 undefined，说明 reflect-metadata 没有正确获取类型
      // 在这种情况下，我们不能使用 Object，因为 Object 不是正确的依赖类型
      if (!paramType) {
        throw new Error(
          `Cannot determine dependency type for parameter ${parameterIndex} of ${constructor.name}. ` +
            "Please provide explicit type using @Inject(Type) or ensure emitDecoratorMetadata is enabled.",
        );
      }
      dependencyType = paramType;
    }

    // 保存类型引用到 WeakMap（避免 Reflect.defineMetadata 序列化问题）
    // 无论 dependencyType 是什么类型，都保存到 WeakMap 中
    if (!typeReferenceMap.has(constructor)) {
      typeReferenceMap.set(constructor, new Map());
    }
    const typeRefs = typeReferenceMap.get(constructor)!;
    // 保存类型引用（无论是函数类型还是其他类型）
    typeRefs.set(String(parameterIndex), dependencyType);

    metadata[parameterIndex] = {
      index: parameterIndex,
      type: dependencyType,
      token: dependencyToken,
    };

    // 调试：记录元数据保存信息
    if (constructor.name === "Service" || constructor.name === "Level2") {
      logger.debug(
        `[DI Debug] @Inject(${
          token
            ? (typeof token === "function" ? token.name : String(token))
            : "auto"
        }) on ${constructor.name}[${parameterIndex}]: saving metadata.length=${metadata.length}`,
      );
    }

    Reflect.defineMetadata(DEPENDENCY_METADATA_KEY, metadata, constructor);

    // 调试：验证元数据是否被正确保存
    if (constructor.name === "Service" || constructor.name === "Level2") {
      const savedMetadata = Reflect.getMetadata(
        DEPENDENCY_METADATA_KEY,
        constructor,
      );
      logger.debug(
        `[DI Debug] @Inject on ${constructor.name}: saved metadata.exists=${
          savedMetadata ? "yes" : "no"
        }, length=${savedMetadata?.length || 0}`,
      );
    }
  };
}

/**
 * 获取依赖元数据
 * @param target - 目标类或原型
 * @returns 依赖元数据数组
 */
export function getDependencyMetadata(target: unknown): DependencyMetadata[] {
  // 参数装饰器的元数据保存在构造函数上
  // 如果 target 是构造函数，直接获取
  // 如果 target 是原型，从构造函数获取
  const constructor = typeof target === "function"
    ? target
    : (target as any)?.constructor;
  if (!constructor) {
    return [];
  }
  const rawMetadata = Reflect.getMetadata(DEPENDENCY_METADATA_KEY, constructor);
  const metadata = rawMetadata || [];

  // 调试：记录元数据信息
  if (constructor.name === "Service" || constructor.name === "Level2") {
    LoggerManager.getLogger().debug(
      `[DI Debug] getDependencyMetadata(${constructor.name}): rawMetadata=${
        rawMetadata ? "exists" : "undefined"
      }, length=${metadata.length}`,
    );
  }

  // 从 WeakMap 恢复类型引用（避免 Reflect.defineMetadata 序列化问题）
  const typeRefs = typeReferenceMap.get(constructor);
  if (typeRefs) {
    for (let i = 0; i < metadata.length; i++) {
      const meta = metadata[i];
      if (meta !== undefined && meta !== null) {
        const typeRef = typeRefs.get(String(meta.index));
        if (typeRef && typeof typeRef === "function") {
          // 恢复类型引用
          meta.type = typeRef;
        }
      }
    }
  }

  // 返回完整的元数据数组（包括 undefined），让调用者决定如何处理
  return metadata;
}

/**
 * 检查类是否可注入
 * @param target - 目标类
 * @returns 是否可注入
 */
export function isInjectable(target: Constructor<unknown>): boolean {
  return Reflect.getMetadata(INJECTABLE_METADATA_KEY, target) === true;
}

/**
 * 获取类的生命周期配置
 * @param target - 目标类
 * @returns 生命周期
 */
export function getLifecycle(
  target: Constructor<unknown>,
): Lifecycle | undefined {
  return Reflect.getMetadata("lifecycle", target);
}

/**
 * 获取类型引用（从 WeakMap）
 * @param constructor - 构造函数
 * @param parameterIndex - 参数索引
 * @returns 类型引用
 */
export function getTypeReference(
  constructor: Constructor<unknown>,
  parameterIndex: number,
): Constructor<unknown> | undefined {
  const typeRefs = typeReferenceMap.get(constructor);
  if (typeRefs) {
    return typeRefs.get(String(parameterIndex)) as Constructor<unknown>;
  }
  return undefined as unknown as Constructor<unknown>;
}
