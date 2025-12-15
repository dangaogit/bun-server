import type { ServiceRegistry, ServiceInstance } from './types';
import { SERVICE_REGISTRY_TOKEN } from './types';
import { HEALTH_INDICATORS_TOKEN } from '../../health/types';
import type { HealthIndicator } from '../../health/types';
import { ControllerRegistry } from '../../controller/controller';

/**
 * 健康检查与服务注册集成器
 * 根据健康检查状态自动更新服务注册的健康状态
 */
export class ServiceRegistryHealthIntegration {
  private serviceRegistry?: ServiceRegistry;
  private healthIndicators: HealthIndicator[] = [];
  private updateInterval?: ReturnType<typeof setInterval>;
  private registeredInstances: Map<string, ServiceInstance> = new Map();

  /**
   * 注册服务实例并启动健康检查集成
   */
  public async registerWithHealthCheck(
    instance: ServiceInstance,
  ): Promise<void> {
    // 保存实例信息
    this.registeredInstances.set(
      `${instance.serviceName}:${instance.ip}:${instance.port}`,
      instance,
    );

    // 获取 ServiceRegistry
    try {
      const container = ControllerRegistry.getInstance().getContainer();
      this.serviceRegistry = container.resolve<ServiceRegistry>(
        SERVICE_REGISTRY_TOKEN,
      );
      this.healthIndicators = container.resolve<HealthIndicator[]>(
        HEALTH_INDICATORS_TOKEN,
      ) || [];
    } catch (error) {
      console.warn(
        '[ServiceRegistryHealthIntegration] ServiceRegistry or HealthIndicators not found',
      );
    }

    if (!this.serviceRegistry) {
      return;
    }

    // 初始注册
    await this.serviceRegistry.register(instance);

    // 启动定期健康检查更新
    this.startHealthCheckUpdates(instance);
  }

  /**
   * 启动健康检查更新
   */
  private startHealthCheckUpdates(instance: ServiceInstance): void {
    // 如果已经有更新任务在运行，不重复启动
    if (this.updateInterval) {
      return;
    }

    // 定期更新健康状态（每 30 秒）
    this.updateInterval = setInterval(async () => {
      await this.updateHealthStatus();
    }, 30000);

    // 立即执行一次
    this.updateHealthStatus().catch((error) => {
      console.error('[ServiceRegistryHealthIntegration] Failed to update health status:', error);
    });
  }

  /**
   * 更新所有注册服务的健康状态
   */
  private async updateHealthStatus(): Promise<void> {
    if (!this.serviceRegistry) {
      return;
    }

    // 检查健康状态
    const isHealthy = await this.checkHealth();

    // 更新所有注册实例的健康状态
    for (const instance of this.registeredInstances.values()) {
      if (instance.healthy !== isHealthy) {
        try {
          // 更新实例的健康状态
          const updatedInstance: ServiceInstance = {
            ...instance,
            healthy: isHealthy,
          };

          // 通过续约更新健康状态
          await this.serviceRegistry.renew(updatedInstance);

          console.log(
            `[ServiceRegistryHealthIntegration] Updated health status for ${instance.serviceName} to ${isHealthy ? 'healthy' : 'unhealthy'}`,
          );
        } catch (error) {
          console.error(
            `[ServiceRegistryHealthIntegration] Failed to update health status for ${instance.serviceName}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * 检查应用健康状态
   */
  private async checkHealth(): Promise<boolean> {
    if (this.healthIndicators.length === 0) {
      // 如果没有健康检查指示器，默认认为健康
      return true;
    }

    try {
      // 检查所有健康指示器
      for (const indicator of this.healthIndicators) {
        const result = await Promise.resolve(indicator.check());
        if (result.status !== 'up') {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('[ServiceRegistryHealthIntegration] Health check failed:', error);
      return false;
    }
  }

  /**
   * 停止健康检查更新
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }
}

