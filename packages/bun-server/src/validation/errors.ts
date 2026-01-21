export interface ValidationIssue {
  /**
   * 参数索引（参数级别验证使用）
   */
  index?: number;

  /**
   * 属性路径（类级别验证使用，支持嵌套如 'user.address.city'）
   */
  property?: string;

  /**
   * 失败的规则名称
   */
  rule: string;

  /**
   * 错误信息
   */
  message: string;

  /**
   * 验证失败的值
   */
  value?: unknown;

  /**
   * 嵌套错误（用于嵌套对象验证）
   */
  children?: ValidationIssue[];
}

export class ValidationError extends Error {
  public readonly issues: ValidationIssue[];

  public constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }

  /**
   * 获取所有错误的扁平化列表
   */
  public getFlattened(): ValidationIssue[] {
    const flatten = (issues: ValidationIssue[], prefix = ''): ValidationIssue[] => {
      const result: ValidationIssue[] = [];
      for (const issue of issues) {
        const propertyPath = prefix ? `${prefix}.${issue.property ?? ''}` : (issue.property ?? '');
        if (issue.children && issue.children.length > 0) {
          result.push(...flatten(issue.children, propertyPath));
        } else {
          result.push({
            ...issue,
            property: propertyPath || undefined,
          });
        }
      }
      return result;
    };
    return flatten(this.issues);
  }

  /**
   * 转换为简单的错误对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      issues: this.issues,
    };
  }
}


