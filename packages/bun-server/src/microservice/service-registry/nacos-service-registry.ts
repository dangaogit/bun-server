import { NacosClient, NacosServiceClient } from '@dangao/nacos-client';
import type {
  ServiceInstance,
  GetInstancesOptions,
  InstancesChangeListener,
  ServiceRegistry,
} from './types';

/**
 * Nacos 服务注册中心实现
 * 实现 ServiceRegistry 接口，内部使用 @dangao/nacos-client
 */
export class NacosServiceRegistry implements ServiceRegistry {
  private readonly client: NacosClient;
  private readonly serviceClient: NacosServiceClient;
  private readonly watchers: Map<string, { listener: InstancesChangeListener; intervalId: number }> = new Map();
  private readonly watchInterval: number = 5000; // 默认 5 秒轮询一次
  private readonly heartbeatInterval: number = 5000; // 默认 5 秒发送一次心跳
  private heartbeatTimers: Map<string, number> = new Map();

  public constructor(
    client: NacosClient,
    options?: {
      /**
       * 服务实例变更监听轮询间隔（毫秒）
       * @default 5000
       */
      watchInterval?: number;

      /**
       * 心跳间隔（毫秒）
       * @default 5000
       */
      heartbeatInterval?: number;
    },
  ) {
    this.client = client;
    this.serviceClient = new NacosServiceClient(client);
    this.watchInterval = options?.watchInterval ?? 5000;
    this.heartbeatInterval = options?.heartbeatInterval ?? 5000;
  }

  /**
   * 注册服务实例
   */
  public async register(instance: ServiceInstance): Promise<void> {
    await this.serviceClient.registerInstance({
      serviceName: instance.serviceName,
      ip: instance.ip,
      port: instance.port,
      weight: instance.weight,
      enabled: instance.enabled,
      metadata: instance.metadata,
      clusterName: instance.clusterName,
      namespaceId: instance.namespaceId,
      groupName: instance.groupName,
      heartBeat: false,
    });

    // 启动心跳机制
    this.startHeartbeat(instance);
  }

  /**
   * 注销服务实例
   */
  public async deregister(instance: ServiceInstance): Promise<void> {
    // 停止心跳
    this.stopHeartbeat(instance);

    await this.serviceClient.deregisterInstance(instance.serviceName, instance.ip, instance.port, {
      namespaceId: instance.namespaceId,
      groupName: instance.groupName,
      clusterName: instance.clusterName,
    });
  }

  /**
   * 续约服务实例（心跳）
   */
  public async renew(instance: ServiceInstance): Promise<void> {
    await this.serviceClient.registerInstance({
      serviceName: instance.serviceName,
      ip: instance.ip,
      port: instance.port,
      weight: instance.weight,
      enabled: instance.enabled,
      metadata: instance.metadata,
      clusterName: instance.clusterName,
      namespaceId: instance.namespaceId,
      groupName: instance.groupName,
      heartBeat: true,
    });
  }

  /**
   * 查询服务实例列表
   */
  public async getInstances(
    serviceName: string,
    options?: GetInstancesOptions,
  ): Promise<ServiceInstance[]> {
    const instances = await this.serviceClient.getInstances({
      serviceName,
      namespaceId: options?.namespaceId,
      groupName: options?.groupName,
      clusterName: options?.clusterName,
      healthyOnly: options?.healthyOnly,
    });

    return instances.map((instance) => ({
      serviceName: instance.serviceName,
      ip: instance.ip,
      port: instance.port,
      weight: instance.weight,
      healthy: instance.healthy,
      enabled: instance.enabled,
      metadata: instance.metadata,
      clusterName: instance.clusterName,
      namespaceId: instance.namespaceId,
      groupName: instance.groupName,
    }));
  }

  /**
   * 监听服务实例变更
   * 通过轮询实现服务实例变更监听（Nacos 3.X 移除 UDP 推送）
   */
  public watchInstances(
    serviceName: string,
    listener: InstancesChangeListener,
    options?: GetInstancesOptions,
  ): () => void {
    const key = this.getWatchKey(serviceName, options);

    // 如果已经存在监听器，先取消
    const existing = this.watchers.get(key);
    if (existing) {
      clearInterval(existing.intervalId);
    }

    const intervalId = setInterval(async () => {
      try {
        const instances = await this.getInstances(serviceName, options);
        listener(instances);
      } catch (error) {
        // 监听错误不抛出，避免影响其他监听器
        console.error(`[NacosServiceRegistry] Failed to watch instances ${serviceName}:`, error);
      }
    }, this.watchInterval) as unknown as number;

    // 立即获取一次实例列表
    this.getInstances(serviceName, options)
      .then((instances) => {
        listener(instances);
      })
      .catch((error) => {
        console.error(`[NacosServiceRegistry] Failed to get initial instances ${serviceName}:`, error);
      });

    this.watchers.set(key, { listener, intervalId });

    // 返回取消监听的函数
    return () => {
      const watcher = this.watchers.get(key);
      if (watcher) {
        clearInterval(watcher.intervalId);
        this.watchers.delete(key);
      }
    };
  }

  /**
   * 关闭注册中心连接
   */
  public async close(): Promise<void> {
    // 清除所有监听器
    for (const watcher of this.watchers.values()) {
      clearInterval(watcher.intervalId);
    }
    this.watchers.clear();

    // 清除所有心跳定时器
    for (const timerId of this.heartbeatTimers.values()) {
      clearInterval(timerId);
    }
    this.heartbeatTimers.clear();
  }

  /**
   * 启动心跳机制
   */
  private startHeartbeat(instance: ServiceInstance): void {
    const key = this.getInstanceKey(instance);

    // 如果已经存在心跳，先停止
    const existing = this.heartbeatTimers.get(key);
    if (existing) {
      clearInterval(existing);
    }

    const timerId = setInterval(async () => {
      try {
        await this.renew(instance);
      } catch (error) {
        console.error(`[NacosServiceRegistry] Failed to send heartbeat for ${instance.serviceName}:`, error);
        // 心跳失败时，尝试重新注册
        try {
          await this.register(instance);
        } catch (registerError) {
          console.error(`[NacosServiceRegistry] Failed to re-register ${instance.serviceName}:`, registerError);
        }
      }
    }, this.heartbeatInterval) as unknown as number;

    this.heartbeatTimers.set(key, timerId);
  }

  /**
   * 停止心跳机制
   */
  private stopHeartbeat(instance: ServiceInstance): void {
    const key = this.getInstanceKey(instance);
    const timerId = this.heartbeatTimers.get(key);
    if (timerId) {
      clearInterval(timerId);
      this.heartbeatTimers.delete(key);
    }
  }

  /**
   * 生成监听器 key
   */
  private getWatchKey(serviceName: string, options?: GetInstancesOptions): string {
    const parts = [
      options?.namespaceId ?? 'default',
      options?.groupName ?? 'DEFAULT_GROUP',
      options?.clusterName ?? 'DEFAULT',
      serviceName,
    ];
    return parts.join(':');
  }

  /**
   * 生成实例 key
   */
  private getInstanceKey(instance: ServiceInstance): string {
    const parts = [
      instance.namespaceId ?? 'default',
      instance.groupName ?? 'DEFAULT_GROUP',
      instance.clusterName ?? 'DEFAULT',
      instance.serviceName,
      instance.ip,
      instance.port.toString(),
    ];
    return parts.join(':');
  }
}

