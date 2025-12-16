import 'reflect-metadata';
import type { ConfigCenter } from './types';
import { CONFIG_CENTER_TOKEN } from './types';
import { ControllerRegistry } from '../../controller/controller';
import type { Constructor } from '../../core/types';

/**
 * 配置中心值装饰器元数据键
 */
const CONFIG_CENTER_VALUE_METADATA_KEY = Symbol('config-center:value');

/**
 * 配置中心值元数据
 */
export interface ConfigCenterValueMetadata {
  /**
   * 配置 dataId
   */
  dataId: string;

  /**
   * 配置分组
   */
  groupName: string;

  /**
   * 命名空间（可选）
   */
  namespaceId?: string;

  /**
   * 默认值（可选）
   */
  defaultValue?: string;

  /**
   * 是否监听配置变更
   */
  watch?: boolean;
}

/**
 * ConfigCenterValue 装饰器
 * 用于自动注入配置中心的值
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   @ConfigCenterValue('my-config', 'DEFAULT_GROUP')
 *   public configValue: string = '';
 *
 *   @ConfigCenterValue('app-name', 'DEFAULT_GROUP', { defaultValue: 'MyApp' })
 *   public appName: string = '';
 * }
 * ```
 */
export function ConfigCenterValue(
  dataId: string,
  groupName: string = 'DEFAULT_GROUP',
  options?: {
    namespaceId?: string;
    defaultValue?: string;
    watch?: boolean;
  },
): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const metadata: ConfigCenterValueMetadata = {
      dataId,
      groupName,
      namespaceId: options?.namespaceId,
      defaultValue: options?.defaultValue,
      watch: options?.watch ?? false,
    };

    // 保存元数据
    const existingMetadata: Map<string | symbol, ConfigCenterValueMetadata> =
      Reflect.getMetadata(CONFIG_CENTER_VALUE_METADATA_KEY, target.constructor) ||
      new Map();
    existingMetadata.set(propertyKey, metadata);
    Reflect.defineMetadata(
      CONFIG_CENTER_VALUE_METADATA_KEY,
      existingMetadata,
      target.constructor,
    );

    // 定义属性描述符，实现自动注入
    // 注意：属性 getter 必须是同步的，不能是 async
    // 实际值通过 initializeConfigCenterValues 在实例化时预加载
    let value: string | undefined = options?.defaultValue;

    Object.defineProperty(target, propertyKey, {
      get: () => {
        // 同步返回已加载的值（如果还未加载，返回默认值）
        return value ?? options?.defaultValue ?? '';
      },
      set: (newValue: string) => {
        value = newValue;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * 获取类的所有配置中心值元数据
 */
export function getConfigCenterValueMetadata(
  target: Constructor<unknown>,
): Map<string | symbol, ConfigCenterValueMetadata> {
  return (
    Reflect.getMetadata(CONFIG_CENTER_VALUE_METADATA_KEY, target) || new Map()
  );
}

/**
 * 初始化类的配置中心值
 * 在类实例化后调用，自动加载配置值
 */
export async function initializeConfigCenterValues(
  instance: object,
  target: Constructor<unknown>,
): Promise<void> {
  const metadata = getConfigCenterValueMetadata(target);
  const container = ControllerRegistry.getInstance().getContainer();
  const configCenter = container.resolve<ConfigCenter>(CONFIG_CENTER_TOKEN);

  if (!configCenter) {
    return;
  }

  for (const [propertyKey, meta] of metadata.entries()) {
    try {
      const result = await configCenter.getConfig(
        meta.dataId,
        meta.groupName,
        meta.namespaceId,
      );
      (instance as any)[propertyKey] = result.content;

      // 如果启用监听，设置监听器
      if (meta.watch) {
        configCenter.watchConfig(meta.dataId, meta.groupName, (newResult: any) => {
          (instance as any)[propertyKey] = newResult.content;
        });
      }
    } catch (error) {
      console.error(
        `[ConfigCenterValue] Failed to initialize config ${meta.dataId}:`,
        error,
      );
      if (meta.defaultValue !== undefined) {
        (instance as any)[propertyKey] = meta.defaultValue;
      }
    }
  }
}

