/**
 * 配置中心抽象接口
 * 定义配置中心的核心能力，不依赖具体实现
 */
export interface ConfigCenter {
  /**
   * 获取配置
   * @param dataId - 配置 ID
   * @param groupName - 配置分组
   * @param namespaceId - 命名空间
   * @returns 配置内容
   */
  getConfig(
    dataId: string,
    groupName: string,
    namespaceId?: string,
  ): Promise<ConfigResult>;

  /**
   * 监听配置变更
   * @param dataId - 配置 ID
   * @param groupName - 配置分组
   * @param listener - 变更监听器
   * @param namespaceId - 命名空间（可选）
   * @returns 取消监听的函数
   */
  watchConfig(
    dataId: string,
    groupName: string,
    listener: ConfigChangeListener,
    namespaceId?: string,
  ): () => void;

  /**
   * 关闭配置中心连接
   */
  close(): Promise<void>;
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
   * 配置 MD5 值（用于判断配置是否变更）
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
 * 配置变更监听器
 */
export interface ConfigChangeListener {
  /**
   * 配置变更回调
   * @param result - 新的配置结果
   */
  (result: ConfigResult): void;
}

/**
 * ConfigCenter Token（用于依赖注入）
 */
export const CONFIG_CENTER_TOKEN = Symbol('CONFIG_CENTER_TOKEN');

