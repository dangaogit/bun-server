import type { ValidationRuleDefinition } from '../types';

export interface RuleOptions {
  message?: string;
}

/**
 * 验证值是否为布尔值
 */
export function IsBoolean(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isBoolean',
    message: options.message ?? '必须是布尔值',
    validate: (value) => typeof value === 'boolean',
  };
}

/**
 * 验证值是否为整数
 */
export function IsInt(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isInt',
    message: options.message ?? '必须是整数',
    validate: (value) => typeof value === 'number' && Number.isInteger(value),
  };
}

/**
 * 验证值是否为正数
 */
export function IsPositive(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isPositive',
    message: options.message ?? '必须是正数',
    validate: (value) => typeof value === 'number' && value > 0,
  };
}

/**
 * 验证值是否为负数
 */
export function IsNegative(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isNegative',
    message: options.message ?? '必须是负数',
    validate: (value) => typeof value === 'number' && value < 0,
  };
}

/**
 * 验证数字最小值
 */
export function Min(min: number, options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'min',
    message: options.message ?? `不能小于 ${min}`,
    validate: (value) => typeof value === 'number' && value >= min,
  };
}

/**
 * 验证数字最大值
 */
export function Max(max: number, options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'max',
    message: options.message ?? `不能大于 ${max}`,
    validate: (value) => typeof value === 'number' && value <= max,
  };
}

/**
 * 验证值是否为日期
 */
export function IsDate(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isDate',
    message: options.message ?? '必须是有效的日期',
    validate: (value) => {
      if (value instanceof Date) {
        return !Number.isNaN(value.getTime());
      }
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return !Number.isNaN(date.getTime());
      }
      return false;
    },
  };
}

export type UUIDVersion = '3' | '4' | '5' | 'all';

const UUID_PATTERNS: Record<UUIDVersion, RegExp> = {
  '3': /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  '4': /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  '5': /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  'all': /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

/**
 * 验证值是否为 UUID
 */
export function IsUUID(version: UUIDVersion = 'all', options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isUUID',
    message: options.message ?? `必须是有效的 UUID${version !== 'all' ? ` (v${version})` : ''}`,
    validate: (value) => typeof value === 'string' && UUID_PATTERNS[version].test(value),
  };
}

/**
 * 验证字符串长度
 */
export function Length(min: number, max?: number, options: RuleOptions = {}): ValidationRuleDefinition {
  const maxMsg = max !== undefined ? ` 且不能大于 ${max}` : '';
  return {
    name: 'length',
    message: options.message ?? `长度不能小于 ${min}${maxMsg}`,
    validate: (value) => {
      if (typeof value !== 'string') {
        return false;
      }
      if (value.length < min) {
        return false;
      }
      if (max !== undefined && value.length > max) {
        return false;
      }
      return true;
    },
  };
}

/**
 * 验证字符串最大长度
 */
export function MaxLength(max: number, options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'maxLength',
    message: options.message ?? `长度不能大于 ${max}`,
    validate: (value) => typeof value === 'string' && value.length <= max,
  };
}

/**
 * 验证值是否匹配正则表达式
 */
export function Matches(pattern: RegExp, options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'matches',
    message: options.message ?? `必须匹配格式 ${pattern.toString()}`,
    validate: (value) => typeof value === 'string' && pattern.test(value),
  };
}

/**
 * 验证值是否在指定列表中
 */
export function IsIn(values: unknown[], options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isIn',
    message: options.message ?? `必须是以下值之一: ${values.join(', ')}`,
    validate: (value) => values.includes(value),
  };
}

/**
 * 验证值是否不在指定列表中
 */
export function IsNotIn(values: unknown[], options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isNotIn',
    message: options.message ?? `不能是以下值之一: ${values.join(', ')}`,
    validate: (value) => !values.includes(value),
  };
}

/**
 * 验证值是否为 URL
 */
export function IsUrl(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isUrl',
    message: options.message ?? '必须是有效的 URL',
    validate: (value) => {
      if (typeof value !== 'string') {
        return false;
      }
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * 验证值是否为 JSON 字符串
 */
export function IsJSON(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isJSON',
    message: options.message ?? '必须是有效的 JSON 字符串',
    validate: (value) => {
      if (typeof value !== 'string') {
        return false;
      }
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * 验证值是否相等
 */
export function Equals(comparison: unknown, options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'equals',
    message: options.message ?? `必须等于 ${comparison}`,
    validate: (value) => value === comparison,
  };
}

/**
 * 验证值是否不相等
 */
export function NotEquals(comparison: unknown, options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'notEquals',
    message: options.message ?? `不能等于 ${comparison}`,
    validate: (value) => value !== comparison,
  };
}

/**
 * 验证是否为 null 或 undefined
 */
export function IsDefined(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isDefined',
    message: options.message ?? '必须定义',
    validate: (value) => value !== null && value !== undefined,
  };
}

/**
 * 验证字符串是否只包含字母数字字符
 */
export function IsAlphanumeric(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isAlphanumeric',
    message: options.message ?? '只能包含字母和数字',
    validate: (value) => typeof value === 'string' && /^[a-zA-Z0-9]+$/.test(value),
  };
}

/**
 * 验证字符串是否只包含字母
 */
export function IsAlpha(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isAlpha',
    message: options.message ?? '只能包含字母',
    validate: (value) => typeof value === 'string' && /^[a-zA-Z]+$/.test(value),
  };
}

/**
 * 验证字符串是否只包含数字
 */
export function IsNumberString(options: RuleOptions = {}): ValidationRuleDefinition {
  return {
    name: 'isNumberString',
    message: options.message ?? '只能包含数字',
    validate: (value) => typeof value === 'string' && /^[0-9]+$/.test(value),
  };
}
