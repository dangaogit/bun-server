import type { ConfigFileFormat } from './types';

/**
 * 配置服务
 * 提供类型安全的配置访问能力
 */
export class ConfigService<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * 解析配置内容，按 JSON -> JSONC -> JSON5 顺序自动尝试
   * 利用 Bun 1.3.6+ 的 Bun.JSONC 和 Bun 1.3.7+ 的 Bun.JSON5
   * @param content - 配置文本内容
   * @param format - 强制指定格式（可选），省略则自动检测
   */
  public static parseConfigContent(content: string, format?: ConfigFileFormat): unknown {
    if (format === 'jsonc') {
      return Bun.JSONC.parse(content);
    }
    if (format === 'json5') {
      return Bun.JSON5.parse(content);
    }
    if (format === 'json') {
      return JSON.parse(content);
    }

    try {
      return JSON.parse(content);
    } catch {
      try {
        return Bun.JSONC.parse(content);
      } catch {
        return Bun.JSON5.parse(content);
      }
    }
  }

  /**
   * 从文件加载配置，根据扩展名自动选择解析器
   * @param filePath - 配置文件路径（.json / .jsonc / .json5）
   */
  public static async loadConfigFile(filePath: string): Promise<Record<string, unknown>> {
    const file = Bun.file(filePath);
    const content = await file.text();

    let format: ConfigFileFormat | undefined;
    if (filePath.endsWith('.json5')) {
      format = 'json5';
    } else if (filePath.endsWith('.jsonc')) {
      format = 'jsonc';
    } else if (filePath.endsWith('.json')) {
      format = 'json';
    }

    return ConfigService.parseConfigContent(content, format) as Record<string, unknown>;
  }

  private config: TConfig;
  private readonly namespace?: string;
  private configUpdateListeners: Array<(config: TConfig) => void> = [];

  public constructor(config: TConfig, namespace?: string) {
    this.config = config;
    this.namespace = namespace;
  }

  /**
   * 更新配置（用于配置中心动态刷新）
   * @param newConfig - 新配置对象
   */
  public updateConfig(newConfig: TConfig): void {
    this.config = newConfig;
    // 通知所有监听器
    for (const listener of this.configUpdateListeners) {
      try {
        listener(newConfig);
      } catch (error) {
        console.error('[ConfigService] Error in config update listener:', error);
      }
    }
  }

  /**
   * 合并配置（用于配置中心增量更新）
   * @param partialConfig - 部分配置对象
   */
  public mergeConfig(partialConfig: Partial<TConfig>): void {
    this.config = {
      ...this.config,
      ...partialConfig,
    } as TConfig;
    // 通知所有监听器
    for (const listener of this.configUpdateListeners) {
      try {
        listener(this.config);
      } catch (error) {
        console.error('[ConfigService] Error in config update listener:', error);
      }
    }
  }

  /**
   * 添加配置更新监听器
   * @param listener - 监听器函数
   * @returns 取消监听的函数
   */
  public onConfigUpdate(listener: (config: TConfig) => void): () => void {
    this.configUpdateListeners.push(listener);
    return () => {
      const index = this.configUpdateListeners.indexOf(listener);
      if (index > -1) {
        this.configUpdateListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取完整配置对象
   */
  public getAll(): TConfig {
    return this.config;
  }

  /**
   * 获取配置值（支持点号路径）
   * @param key - 配置键（如 "db.host"）
   * @param defaultValue - 默认值（可选）
   */
  public get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const namespacedKey = this.applyNamespace(key);
    const value = this.getValueByPath(this.config, namespacedKey);
    if (value === undefined) {
      return defaultValue;
    }
    return value as T;
  }

  /**
   * 获取必需的配置值，如果不存在则抛出错误
   * @param key - 配置键
   */
  public getRequired<T = unknown>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Config value required for key: ${key}`);
    }
    return value;
  }

  /**
   * 创建带命名空间的 ConfigService 视图
   * @param namespace - 命名空间前缀
   */
  public withNamespace(namespace: string): ConfigService<TConfig> {
    return new ConfigService<TConfig>(this.config, namespace);
  }

  private applyNamespace(key: string): string {
    if (!this.namespace) {
      return key;
    }
    if (!key) {
      return this.namespace;
    }
    if (key.startsWith(this.namespace + '.')) {
      return key;
    }
    return `${this.namespace}.${key}`;
  }

  private getValueByPath(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    if (!path) {
      return obj;
    }
    const segments = path.split('.');
    let current: unknown = obj;

    for (const segment of segments) {
      if (
        current === undefined ||
        current === null ||
        typeof current !== 'object'
      ) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }
}


