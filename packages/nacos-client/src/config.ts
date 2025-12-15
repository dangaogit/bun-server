import { NacosClient } from './client';
import type { ConfigResult, GetConfigOptions } from './types';

/**
 * Nacos 配置管理客户端
 */
export class NacosConfigClient {
  private readonly client: NacosClient;

  public constructor(client: NacosClient) {
    this.client = client;
  }

  /**
   * 获取配置
   * API: GET /nacos/v3/client/cs/config
   */
  public async getConfig(options: GetConfigOptions): Promise<ConfigResult> {
    const namespaceId = options.namespaceId ?? this.client.getNamespaceId();

    const params: Record<string, string | undefined> = {
      dataId: options.dataId,
      groupName: options.groupName,
    };

    if (namespaceId) {
      params.namespaceId = namespaceId;
    }

    // Nacos API 返回格式: { code: 0, data: ConfigResult, message: "success" }
    const response = await this.client.get<{
      code: number;
      data: ConfigResult;
      message: string;
    }>('/nacos/v3/client/cs/config', params);

    // 检查响应状态
    if (response.code !== 0) {
      throw new Error(`Nacos config API error: ${response.message || 'Unknown error'}`);
    }

    // 返回 data 字段中的配置数据
    return response.data;
  }
}

