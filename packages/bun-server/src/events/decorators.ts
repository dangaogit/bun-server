import 'reflect-metadata';
import {
  ON_EVENT_METADATA_KEY,
  EVENT_LISTENER_CLASS_METADATA_KEY,
  type OnEventMethodMetadata,
} from './types';

/**
 * OnEvent 装饰器选项
 */
export interface OnEventOptions {
  /**
   * 是否异步处理
   * @default false
   */
  async?: boolean;

  /**
   * 监听器优先级（数值越大优先级越高）
   * @default 0
   */
  priority?: number;
}

/**
 * 事件监听器装饰器
 * 用于标记方法为事件监听器
 *
 * @param event - 事件名称或标识符
 * @param options - 监听选项
 *
 * @example
 * ```typescript
 * @Injectable()
 * class NotificationService {
 *   @OnEvent('user.created')
 *   handleUserCreated(payload: UserCreatedEvent) {
 *     console.log('User created:', payload.userId);
 *   }
 *
 *   @OnEvent(USER_DELETED, { async: true, priority: 10 })
 *   async handleUserDeleted(payload: UserDeletedEvent) {
 *     await this.cleanup(payload.userId);
 *   }
 * }
 * ```
 */
export function OnEvent(
  event: string | symbol,
  options: OnEventOptions = {},
): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const methodName = String(propertyKey);
    const constructor = target.constructor;

    // 获取类上已有的事件监听器元数据
    const existingMetadata: OnEventMethodMetadata[] =
      Reflect.getMetadata(ON_EVENT_METADATA_KEY, constructor) || [];

    // 添加新的监听器元数据
    const metadata: OnEventMethodMetadata = {
      methodName,
      event,
      async: options.async ?? false,
      priority: options.priority ?? 0,
    };

    Reflect.defineMetadata(
      ON_EVENT_METADATA_KEY,
      [...existingMetadata, metadata],
      constructor,
    );

    // 标记类为事件监听器类
    Reflect.defineMetadata(EVENT_LISTENER_CLASS_METADATA_KEY, true, constructor);

    return descriptor;
  };
}

/**
 * 获取类的事件监听器元数据
 * @param target - 目标类
 */
export function getOnEventMetadata(
  target: Function,
): OnEventMethodMetadata[] | undefined {
  return Reflect.getMetadata(ON_EVENT_METADATA_KEY, target);
}

/**
 * 检查类是否为事件监听器类
 * @param target - 目标类
 */
export function isEventListenerClass(target: Function): boolean {
  return (
    Reflect.getMetadata(EVENT_LISTENER_CLASS_METADATA_KEY, target) === true
  );
}
