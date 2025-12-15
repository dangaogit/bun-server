import 'reflect-metadata';
import { ConfigCenterValue } from './decorators';
import type { Constructor } from '../../core/types';

/**
 * NacosValue 装饰器
 * Nacos 特定的配置值注入装饰器
 * 这是 @ConfigCenterValue 的便捷别名，专门用于 Nacos
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   @NacosValue('my-config', 'DEFAULT_GROUP')
 *   public configValue: string = '';
 *
 *   @NacosValue('app-name', 'DEFAULT_GROUP', { defaultValue: 'MyApp' })
 *   public appName: string = '';
 * }
 * ```
 */
export function NacosValue(
  dataId: string,
  groupName: string = 'DEFAULT_GROUP',
  options?: {
    namespaceId?: string;
    defaultValue?: string;
    watch?: boolean;
  },
): PropertyDecorator {
  // 直接使用 ConfigCenterValue，因为 NacosConfigCenter 实现了 ConfigCenter 接口
  return ConfigCenterValue(dataId, groupName, options);
}

