/**
 * 服务注册中心抽象接口
 * 定义服务注册与发现的核心能力，不依赖具体实现
 */
export interface ServiceRegistry {
  /**
   * 注册服务实例
   * @param instance - 服务实例信息
   */
  register(instance: ServiceInstance): Promise<void>;

  /**
   * 注销服务实例
   * @param instance - 服务实例信息
   */
  deregister(instance: ServiceInstance): Promise<void>;

  /**
   * 续约服务实例（心跳）
   * @param instance - 服务实例信息
   */
  renew(instance: ServiceInstance): Promise<void>;

  /**
   * 查询服务实例列表
   * @param serviceName - 服务名
   * @param options - 查询选项
   * @returns 服务实例列表
   */
  getInstances(
    serviceName: string,
    options?: GetInstancesOptions,
  ): Promise<ServiceInstance[]>;

  /**
   * 监听服务实例变更
   * @param serviceName - 服务名
   * @param listener - 变更监听器
   * @param options - 查询选项（可选）
   * @returns 取消监听的函数
   */
  watchInstances(
    serviceName: string,
    listener: InstancesChangeListener,
    options?: GetInstancesOptions,
  ): () => void;

  /**
   * 关闭注册中心连接
   */
  close(): Promise<void>;
}

/**
 * 服务实例信息
 */
export interface ServiceInstance {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * 实例 IP
   */
  ip: string;

  /**
   * 实例端口
   */
  port: number;

  /**
   * 权重（可选）
   */
  weight?: number;

  /**
   * 是否健康（可选）
   */
  healthy?: boolean;

  /**
   * 是否启用（可选）
   */
  enabled?: boolean;

  /**
   * 元数据（可选）
   */
  metadata?: Record<string, string>;

  /**
   * 集群名称（可选）
   */
  clusterName?: string;

  /**
   * 命名空间 ID（可选）
   */
  namespaceId?: string;

  /**
   * 分组名称（可选）
   */
  groupName?: string;
}

/**
 * 服务实例查询选项
 */
export interface GetInstancesOptions {
  /**
   * 命名空间 ID（可选）
   */
  namespaceId?: string;

  /**
   * 分组名称（可选）
   */
  groupName?: string;

  /**
   * 集群名称（可选）
   */
  clusterName?: string;

  /**
   * 是否只返回健康实例（可选）
   */
  healthyOnly?: boolean;
}

/**
 * 服务实例变更监听器
 */
export interface InstancesChangeListener {
  /**
   * 服务实例变更回调
   * @param instances - 新的服务实例列表
   */
  (instances: ServiceInstance[]): void;
}

/**
 * ServiceRegistry Token（用于依赖注入）
 */
export const SERVICE_REGISTRY_TOKEN = Symbol('SERVICE_REGISTRY_TOKEN');

