export interface ValidationRuleDefinition {
  /**
   * 规则名称
   */
  name: string;

  /**
   * 错误信息
   */
  message: string;

  /**
   * 校验函数
   */
  validate: (value: unknown) => boolean;

  /**
   * 是否为可选字段
   */
  optional?: boolean;
}

export interface ValidationMetadata {
  /**
   * 参数索引
   */
  index: number;

  /**
   * 规则列表
   */
  rules: ValidationRuleDefinition[];
}


