import type { ValidationRuleDefinition } from '../types';

export interface ArrayRuleOptions {
  message?: string;
}

/**
 * 验证值是否为数组
 */
export function IsArray(options: ArrayRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isArray',
    message: options.message ?? '必须是数组',
    validate: (value) => Array.isArray(value),
  };
}

/**
 * 验证数组最小长度
 */
export function ArrayMinSize(min: number, options: ArrayRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'arrayMinSize',
    message: options.message ?? `数组长度不能小于 ${min}`,
    validate: (value) => Array.isArray(value) && value.length >= min,
  };
}

/**
 * 验证数组最大长度
 */
export function ArrayMaxSize(max: number, options: ArrayRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'arrayMaxSize',
    message: options.message ?? `数组长度不能大于 ${max}`,
    validate: (value) => Array.isArray(value) && value.length <= max,
  };
}

/**
 * 验证数组元素是否唯一
 */
export function ArrayUnique(options: ArrayRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'arrayUnique',
    message: options.message ?? '数组元素必须唯一',
    validate: (value) => {
      if (!Array.isArray(value)) {
        return false;
      }
      const seen = new Set();
      for (const item of value) {
        // 对于对象，使用 JSON.stringify 进行比较
        const key = typeof item === 'object' ? JSON.stringify(item) : item;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
      }
      return true;
    },
  };
}

/**
 * 验证数组是否包含指定的值
 */
export function ArrayContains(values: unknown[], options: ArrayRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'arrayContains',
    message: options.message ?? `数组必须包含 ${values.join(', ')}`,
    validate: (value) => {
      if (!Array.isArray(value)) {
        return false;
      }
      return values.every((v) => {
        if (typeof v === 'object') {
          const vStr = JSON.stringify(v);
          return value.some((item) => JSON.stringify(item) === vStr);
        }
        return value.includes(v);
      });
    },
  };
}

/**
 * 验证数组是否不包含指定的值
 */
export function ArrayNotContains(values: unknown[], options: ArrayRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'arrayNotContains',
    message: options.message ?? `数组不能包含 ${values.join(', ')}`,
    validate: (value) => {
      if (!Array.isArray(value)) {
        return false;
      }
      return values.every((v) => {
        if (typeof v === 'object') {
          const vStr = JSON.stringify(v);
          return !value.some((item) => JSON.stringify(item) === vStr);
        }
        return !value.includes(v);
      });
    },
  };
}

/**
 * 验证数组是否为非空数组
 */
export function ArrayNotEmpty(options: ArrayRuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'arrayNotEmpty',
    message: options.message ?? '数组不能为空',
    validate: (value) => Array.isArray(value) && value.length > 0,
  };
}
