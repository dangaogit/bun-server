import { NacosClient } from './client';
import type {
  GetInstancesOptions,
  RegisterInstanceOptions,
  ServiceInstance,
  ServiceInstanceListResponse,
} from './types';

/**
 * Nacos 服务注册与发现客户端
 */
export class NacosServiceClient {
  private readonly client: NacosClient;

  public constructor(client: NacosClient) {
    this.client = client;
  }

  /**
   * 注册服务实例
   * API: POST /nacos/v3/client/ns/instance
   */
  public async registerInstance(options: RegisterInstanceOptions): Promise<void> {
    const namespaceId = options.namespaceId ?? this.client.getNamespaceId();

    const params: Record<string, string | number | boolean | undefined> = {
      serviceName: options.serviceName,
      ip: options.ip,
      port: options.port,
    };

    if (namespaceId) {
      params.namespaceId = namespaceId;
    }

    if (options.groupName) {
      params.groupName = options.groupName;
    }

    if (options.clusterName) {
      params.clusterName = options.clusterName;
    }

    if (options.weight !== undefined) {
      params.weight = options.weight;
    }

    if (options.enabled !== undefined) {
      params.enabled = options.enabled;
    }

    if (options.heartBeat !== undefined) {
      params.heartBeat = options.heartBeat;
    }

    if (options.metadata) {
      params.metadata = JSON.stringify(options.metadata);
    }

    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        body.append(key, String(value));
      }
    }

    await this.client.post('/nacos/v3/client/ns/instance', undefined, body);
  }

  /**
   * 注销服务实例
   * API: DELETE /nacos/v3/client/ns/instance
   */
  public async deregisterInstance(
    serviceName: string,
    ip: string,
    port: number,
    options?: {
      namespaceId?: string;
      groupName?: string;
      clusterName?: string;
    },
  ): Promise<void> {
    const namespaceId = options?.namespaceId ?? this.client.getNamespaceId();

    const params: Record<string, string | number | undefined> = {
      serviceName,
      ip,
      port,
    };

    if (namespaceId) {
      params.namespaceId = namespaceId;
    }

    if (options?.groupName) {
      params.groupName = options.groupName;
    }

    if (options?.clusterName) {
      params.clusterName = options.clusterName;
    }

    await this.client.delete('/nacos/v3/client/ns/instance', params);
  }

  /**
   * 查询服务实例列表
   * API: GET /nacos/v3/client/ns/instance/list
   */
  public async getInstances(options: GetInstancesOptions): Promise<ServiceInstance[]> {
    const namespaceId = options.namespaceId ?? this.client.getNamespaceId();

    const params: Record<string, string | boolean | undefined> = {
      serviceName: options.serviceName,
    };

    if (namespaceId) {
      params.namespaceId = namespaceId;
    }

    if (options.groupName) {
      params.groupName = options.groupName;
    }

    if (options.clusterName) {
      params.clusterName = options.clusterName;
    }

    if (options.healthyOnly !== undefined) {
      params.healthyOnly = options.healthyOnly;
    }

    // Nacos API 返回格式: { code: 0, data: ServiceInstanceListResponse, message: "success" }
    const response = await this.client.get<{
      code: number;
      data: ServiceInstanceListResponse;
      message: string;
    }>('/nacos/v3/client/ns/instance/list', params);

    // 检查响应状态
    if (response.code !== 0) {
      throw new Error(`Nacos service API error: ${response.message || 'Unknown error'}`);
    }

    // 返回 data 字段中的实例列表
    return response.data.instances ?? [];
  }
}

