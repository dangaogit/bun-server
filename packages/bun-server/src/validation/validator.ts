import type { ValidationMetadata, ValidationRuleDefinition } from './types';
import { ValidationError, type ValidationIssue } from './errors';

function shouldSkip(rule: ValidationRuleDefinition, value: unknown): boolean {
  return rule.optional === true && (value === undefined || value === null);
}

function validateRule(
  rule: ValidationRuleDefinition,
  value: unknown,
  index: number,
): ValidationIssue | null {
  if (shouldSkip(rule, value)) {
    return null;
  }
  const passed = rule.validate(value);
  if (passed) {
    return null;
  }
  return {
    index,
    rule: rule.name,
    message: rule.message,
  };
}

/**
 * 根据元数据验证参数
 * @param params - 参数数组
 * @param metadata - 验证元数据
 */
export function validateParameters(params: unknown[], metadata: ValidationMetadata[]): void {
  if (!metadata.length) {
    return;
  }
  const issues: ValidationIssue[] = [];

  for (const item of metadata) {
    const value = params[item.index];
    let skipped = false;

    for (const rule of item.rules) {
      if (rule.optional && (value === undefined || value === null)) {
        skipped = true;
        break;
      }
      const issue = validateRule(rule, value, item.index);
      if (issue) {
        issues.push(issue);
      }
    }

    if (skipped) {
      continue;
    }
  }

  if (issues.length > 0) {
    throw new ValidationError('Validation failed', issues);
  }
}


