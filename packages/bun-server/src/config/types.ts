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
}

export const CONFIG_SERVICE_TOKEN = Symbol('@dangao/bun-server:config:service');


