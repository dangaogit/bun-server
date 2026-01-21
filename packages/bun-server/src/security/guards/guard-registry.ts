import type { Container } from '../../di/container';
import type { Constructor } from '../../core/types';
import type {
  CanActivate,
  GuardType,
  ExecutionContext,
} from './types';
import { getGuardsMetadata } from './decorators';
import { ForbiddenException } from '../../error/http-exception';
import { ErrorCode } from '../../error/error-codes';

/**
 * 守卫注册表
 * 管理全局守卫和执行守卫链
 */
export class GuardRegistry {
  /**
   * 全局守卫列表
   */
  private globalGuards: GuardType[] = [];

  /**
   * 守卫实例缓存（用于缓存从 DI 容器解析的守卫实例）
   */
  private guardInstances = new Map<Constructor<CanActivate>, CanActivate>();

  /**
   * 注册全局守卫
   * @param guards - 守卫类或实例
   */
  public addGlobalGuards(...guards: GuardType[]): void {
    this.globalGuards.push(...guards);
  }

  /**
   * 获取全局守卫
   * @returns 全局守卫列表
   */
  public getGlobalGuards(): GuardType[] {
    return [...this.globalGuards];
  }

  /**
   * 清除所有全局守卫
   */
  public clearGlobalGuards(): void {
    this.globalGuards = [];
    this.guardInstances.clear();
  }

  /**
   * 解析守卫实例
   * @param guard - 守卫类或实例
   * @param container - DI 容器
   * @returns 守卫实例
   */
  private resolveGuard(guard: GuardType, container: Container): CanActivate {
    // 如果已经是实例，直接返回
    if (typeof guard !== 'function') {
      return guard;
    }

    // 检查缓存
    const cached = this.guardInstances.get(guard as Constructor<CanActivate>);
    if (cached) {
      return cached;
    }

    // 尝试从 DI 容器解析
    try {
      if (container.isRegistered(guard)) {
        const instance = container.resolve<CanActivate>(guard);
        this.guardInstances.set(guard as Constructor<CanActivate>, instance);
        return instance;
      }
    } catch {
      // 如果容器解析失败，继续尝试手动实例化
    }

    // 手动实例化（不支持依赖注入）
    const GuardClass = guard as Constructor<CanActivate>;
    const instance = new GuardClass();
    this.guardInstances.set(guard as Constructor<CanActivate>, instance);
    return instance;
  }

  /**
   * 获取控制器级别的守卫
   * @param controllerClass - 控制器类
   * @returns 守卫列表
   */
  public getControllerGuards(controllerClass: Constructor<unknown>): GuardType[] {
    return getGuardsMetadata(controllerClass);
  }

  /**
   * 获取方法级别的守卫
   * @param controllerClass - 控制器类
   * @param methodName - 方法名
   * @returns 守卫列表
   */
  public getMethodGuards(
    controllerClass: Constructor<unknown>,
    methodName: string,
  ): GuardType[] {
    return getGuardsMetadata(controllerClass.prototype, methodName);
  }

  /**
   * 收集所有守卫（全局 + 控制器 + 方法）
   * @param controllerClass - 控制器类
   * @param methodName - 方法名
   * @returns 按顺序排列的守卫列表
   */
  public collectGuards(
    controllerClass: Constructor<unknown>,
    methodName: string,
  ): GuardType[] {
    const globalGuards = this.getGlobalGuards();
    const controllerGuards = this.getControllerGuards(controllerClass);
    const methodGuards = this.getMethodGuards(controllerClass, methodName);

    // 执行顺序：全局 -> 控制器 -> 方法
    return [...globalGuards, ...controllerGuards, ...methodGuards];
  }

  /**
   * 执行守卫链
   * @param context - 执行上下文
   * @param container - DI 容器
   * @returns 是否允许访问
   * @throws ForbiddenException 如果守卫拒绝访问
   */
  public async executeGuards(
    context: ExecutionContext,
    container: Container,
  ): Promise<boolean> {
    const controllerClass = context.getClass();
    const methodName = context.getMethodName();
    const guards = this.collectGuards(controllerClass, methodName);

    if (guards.length === 0) {
      return true;
    }

    for (const guard of guards) {
      const guardInstance = this.resolveGuard(guard, container);
      const result = await guardInstance.canActivate(context);

      if (!result) {
        // 获取守卫名称用于错误消息
        const guardName = typeof guard === 'function' ? guard.name : guard.constructor.name;
        throw new ForbiddenException(
          `Access denied by guard: ${guardName}`,
          { guard: guardName },
          ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        );
      }
    }

    return true;
  }
}

