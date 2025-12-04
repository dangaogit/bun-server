export interface ValidationIssue {
  /**
   * 参数索引
   */
  index: number;

  /**
   * 失败的规则名称
   */
  rule: string;

  /**
   * 错误信息
   */
  message: string;
}

export class ValidationError extends Error {
  public readonly issues: ValidationIssue[];

  public constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}


