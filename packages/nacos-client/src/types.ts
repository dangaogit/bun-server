/**
 * Nacos 客户端配置选项
 */
export interface NacosClientOptions {
  /**
   * Nacos 服务器地址列表
   * 格式：['http://localhost:8848', 'http://localhost:8849']
   */
  serverList: string[];

  /**
   * 命名空间 ID
   */
  namespaceId?: string;

  /**
   * 用户名（可选）
   */
  username?: string;

  /**
   * 密码（可选）
   */
  password?: string;

  /**
   * 请求超时时间（毫秒）
   * @default 5000
   */
  timeout?: number;

  /**
   * 连接重试次数
   * @default 3
   */
  retryCount?: number;

  /**
   * 连接重试间隔（毫秒）
   * @default 1000
   */
  retryDelay?: number;
}

/**
 * 配置查询结果
 */
export interface ConfigResult {
  /**
   * 配置内容
   */
  content: string;

  /**
   * 配置 MD5 值
   */
  md5: string;

  /**
   * 最后修改时间（时间戳）
   */
  lastModified: number;

  /**
   * 内容类型
   */
  contentType: string;
}

/**
 * 配置查询选项
 */
export interface GetConfigOptions {
  /**
   * 配置 ID
   */
  dataId: string;

  /**
   * 配置分组
   */
  groupName: string;

  /**
   * 命名空间 ID（可选，优先使用 client 配置）
   */
  namespaceId?: string;
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
 * 服务实例注册选项
 */
export interface RegisterInstanceOptions {
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
   * 命名空间 ID（可选，优先使用 client 配置）
   */
  namespaceId?: string;

  /**
   * 分组名称（可选）
   */
  groupName?: string;

  /**
   * 是否为心跳请求（可选）
   */
  heartBeat?: boolean;
}

/**
 * 服务实例查询选项
 */
export interface GetInstancesOptions {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * 命名空间 ID（可选，优先使用 client 配置）
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
 * 服务实例列表响应
 */
export interface ServiceInstanceListResponse {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * 实例列表
   */
  instances: ServiceInstance[];
}

