import type { ValidationRuleDefinition } from '../types';

export interface ObjectRuleOptions {
  message?: string;
}

/**
 * 验证值是否为对象
 */
export function IsObject(options: ObjectRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isObject',
    message: options.message ?? '必须是对象',
    validate: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  };
}

/**
 * 验证值是否为非空（不是 null、undefined、空字符串、空数组、空对象）
 */
export function IsNotEmpty(options: ObjectRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isNotEmpty',
    message: options.message ?? '不能为空',
    validate: (value) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object') {
        return Object.keys(value).length > 0;
      }
      return true;
    },
  };
}

/**
 * 验证值是否为非空对象（对象且至少有一个属性）
 */
export function IsNotEmptyObject(options: ObjectRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isNotEmptyObject',
    message: options.message ?? '必须是非空对象',
    validate: (value) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
      }
      return Object.keys(value).length > 0;
    },
  };
}

export interface ValidateNestedOptions {
  message?: string;
  /**
   * 是否对数组每个元素执行验证
   * @default false
   */
  each?: boolean;
}

/**
 * 嵌套对象验证装饰器
 * 用于标记属性需要嵌套验证
 */
export function ValidateNested(options: ValidateNestedOptions = {}): ValidationRuleDefinition {
  return {
    name: 'validateNested',
    message: options.message ?? '嵌套对象验证失败',
    nested: true,
    each: options.each ?? false,
    validate: (value) => {
      // 基础检查：必须是对象或数组
      if (options.each) {
        return Array.isArray(value);
      }
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    },
  };
}
