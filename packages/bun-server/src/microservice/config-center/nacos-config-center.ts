import { NacosClient, NacosConfigClient } from '@dangao/nacos-client';
import type { ConfigResult, ConfigChangeListener, ConfigCenter } from './types';

/**
 * Nacos 配置中心实现
 * 实现 ConfigCenter 接口，内部使用 @dangao/nacos-client
 */
export class NacosConfigCenter implements ConfigCenter {
  private readonly client: NacosClient;
  private readonly configClient: NacosConfigClient;
  private readonly watchers: Map<string, { listener: ConfigChangeListener; intervalId: number }> = new Map();
  private readonly watchInterval: number = 3000; // 默认 3 秒轮询一次

  public constructor(
    client: NacosClient,
    options?: {
      /**
       * 配置监听轮询间隔（毫秒）
       * @default 3000
       */
      watchInterval?: number;
    },
  ) {
    this.client = client;
    this.configClient = new NacosConfigClient(client);
    this.watchInterval = options?.watchInterval ?? 3000;
  }

  /**
   * 获取配置
   */
  public async getConfig(
    dataId: string,
    groupName: string,
    namespaceId?: string,
  ): Promise<ConfigResult> {
    const result = await this.configClient.getConfig({
      dataId,
      groupName,
      namespaceId,
    });

    return {
      content: result.content,
      md5: result.md5,
      lastModified: result.lastModified,
      contentType: result.contentType,
    };
  }

  /**
   * 监听配置变更
   * 通过轮询和 md5 比对实现配置热更新
   */
  public watchConfig(
    dataId: string,
    groupName: string,
    listener: ConfigChangeListener,
    namespaceId?: string,
  ): () => void {
    const key = this.getWatchKey(dataId, groupName, namespaceId);

    // 如果已经存在监听器，先取消
    const existing = this.watchers.get(key);
    if (existing) {
      clearInterval(existing.intervalId);
    }

    let lastMd5: string | undefined;

    const intervalId = setInterval(async () => {
      try {
        const result = await this.getConfig(dataId, groupName, namespaceId);

        // 通过 md5 判断配置是否变更
        if (lastMd5 === undefined || lastMd5 !== result.md5) {
          lastMd5 = result.md5;
          listener(result);
        }
      } catch (error) {
        // 监听错误不抛出，避免影响其他监听器
        console.error(`[NacosConfigCenter] Failed to watch config ${dataId}:`, error);
      }
    }, this.watchInterval) as unknown as number;

    // 立即获取一次配置
    this.getConfig(dataId, groupName, namespaceId)
      .then((result) => {
        lastMd5 = result.md5;
        listener(result);
      })
      .catch((error) => {
        console.error(`[NacosConfigCenter] Failed to get initial config ${dataId}:`, error);
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
   * 关闭配置中心连接
   */
  public async close(): Promise<void> {
    // 清除所有监听器
    for (const watcher of this.watchers.values()) {
      clearInterval(watcher.intervalId);
    }
    this.watchers.clear();
  }

  /**
   * 生成监听器 key
   */
  private getWatchKey(dataId: string, groupName: string, namespaceId?: string): string {
    return `${namespaceId ?? 'default'}:${groupName}:${dataId}`;
  }
}

