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
   * @param value - 要验证的值
   * @param obj - 完整对象（用于条件验证）
   */
  validate: (value: unknown, obj?: unknown) => boolean;

  /**
   * 是否为可选字段
   */
  optional?: boolean;

  /**
   * 条件验证函数
   * 返回 true 时执行验证，返回 false 时跳过
   */
  condition?: (value: unknown, obj?: unknown) => boolean;

  /**
   * 转换函数（在验证前执行）
   */
  transform?: (value: unknown) => unknown;

  /**
   * 是否为嵌套验证
   */
  nested?: boolean;

  /**
   * 嵌套验证的类型
   */
  nestedType?: new () => unknown;

  /**
   * 是否对数组每个元素执行嵌套验证
   */
  each?: boolean;
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

/**
 * 类级别验证元数据
 */
export interface ClassValidationMetadata {
  /**
   * 属性名
   */
  property: string;

  /**
   * 规则列表
   */
  rules: ValidationRuleDefinition[];
}

/**
 * 验证选项
 */
export interface ValidationOptions {
  /**
   * 是否在第一个错误时停止验证
   * @default false
   */
  stopAtFirstError?: boolean;

  /**
   * 是否跳过缺失的属性
   * @default false
   */
  skipMissingProperties?: boolean;
}


