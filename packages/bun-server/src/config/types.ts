export interface ConfigModuleOptions<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * 默认配置对象（最低优先级）
   */
  defaultConfig?: Partial<TConfig>;

  /**
   * 从环境变量加载配置
   * @param env - process.env 快照
   */
  load?: (env: Record<string, string | undefined>) => Partial<TConfig>;

  /**
   * 配置验证函数（可抛出错误）
   * 可用于集成 class-validator 风格的校验逻辑
   */
  validate?: (config: TConfig) => void;

  /**
   * 命名空间前缀，用于逻辑分组（可选）
   */
  namespace?: string;

  /**
   * 配置中心集成选项（可选）
   */
  configCenter?: {
    /**
     * 是否启用配置中心集成
     */
    enabled?: boolean;

    /**
     * 配置中心配置映射
     * key: 配置路径（如 "app.name"）
     * value: { dataId: string, groupName: string, namespaceId?: string }
     */
    configs?: Map<
      string,
      {
        dataId: string;
        groupName: string;
        namespaceId?: string;
      }
    >;

    /**
     * 配置优先级
     * 配置中心配置 > 环境变量 > 默认配置
     * @default true
     */
    configCenterPriority?: boolean;
  };
}

export const CONFIG_SERVICE_TOKEN = Symbol('@dangao/bun-server:config:service');


