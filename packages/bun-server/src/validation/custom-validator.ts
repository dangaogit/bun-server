import type { ValidationRuleDefinition } from './types';

export interface CustomValidatorOptions {
  message?: string;
}

/**
 * 创建自定义验证器
 *
 * @param name - 验证器名称
 * @param validate - 验证函数，接收值和可选参数，返回布尔值
 * @param defaultMessage - 默认错误消息
 * @returns 验证规则工厂函数
 *
 * @example
 * // 创建手机号验证器
 * const IsPhoneNumber = createCustomValidator(
 *   'isPhoneNumber',
 *   (value) => typeof value === 'string' && /^1[3-9]\d{9}$/.test(value),
 *   '必须是有效的手机号码'
 * );
 *
 * // 使用
 * class UserDto {
 *   @Validate(IsPhoneNumber())
 *   phone: string;
 * }
 *
 * @example
 * // 创建带参数的验证器
 * const IsDivisibleBy = createCustomValidator(
 *   'isDivisibleBy',
 *   (value, divisor: number) => typeof value === 'number' && value % divisor === 0,
 *   (divisor: number) => `必须能被 ${divisor} 整除`
 * );
 *
 * // 使用
 * class NumberDto {
 *   @Validate(IsDivisibleBy(5))
 *   value: number;
 * }
 */
export function createCustomValidator<TArgs extends unknown[] = []>(
  name: string,
  validate: (value: unknown, ...args: TArgs) => boolean,
  defaultMessage: string | ((...args: TArgs) => string),
): (...args: TArgs) => (options?: CustomValidatorOptions) => ValidationRuleDefinition {
  return (...args: TArgs) =>
    (options: CustomValidatorOptions = {}): ValidationRuleDefinition => {
      const message =
        options.message ??
        (typeof defaultMessage === 'function' ? defaultMessage(...args) : defaultMessage);

      return {
        name,
        message,
        validate: (value: unknown) => validate(value, ...args),
      };
    };
}

/**
 * 创建简单自定义验证器（无参数）
 *
 * @param name - 验证器名称
 * @param validate - 验证函数
 * @param defaultMessage - 默认错误消息
 * @returns 验证规则工厂函数
 *
 * @example
 * const IsPhoneNumber = createSimpleValidator(
 *   'isPhoneNumber',
 *   (value) => typeof value === 'string' && /^1[3-9]\d{9}$/.test(value),
 *   '必须是有效的手机号码'
 * );
 *
 * // 使用
 * @Validate(IsPhoneNumber())
 * phone: string;
 */
export function createSimpleValidator(
  name: string,
  validate: (value: unknown) => boolean,
  defaultMessage: string,
): (options?: CustomValidatorOptions) => ValidationRuleDefinition {
  return (options: CustomValidatorOptions = {}): ValidationRuleDefinition => ({
    name,
    message: options.message ?? defaultMessage,
    validate,
  });
}

/**
 * 创建正则表达式验证器
 *
 * @param name - 验证器名称
 * @param pattern - 正则表达式
 * @param defaultMessage - 默认错误消息
 * @returns 验证规则工厂函数
 *
 * @example
 * const IsSlug = createRegexValidator(
 *   'isSlug',
 *   /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
 *   '必须是有效的 slug 格式'
 * );
 */
export function createRegexValidator(
  name: string,
  pattern: RegExp,
  defaultMessage: string,
): (options?: CustomValidatorOptions) => ValidationRuleDefinition {
  return createSimpleValidator(
    name,
    (value) => typeof value === 'string' && pattern.test(value),
    defaultMessage,
  );
}

// ============= 内置扩展验证器 =============

/**
 * 验证中国大陆手机号
 */
export const IsPhoneNumber = createSimpleValidator(
  'isPhoneNumber',
  (value) => typeof value === 'string' && /^1[3-9]\d{9}$/.test(value),
  '必须是有效的手机号码',
);

/**
 * 验证中国身份证号
 */
export const IsIdCard = createSimpleValidator(
  'isIdCard',
  (value) => {
    if (typeof value !== 'string') return false;
    // 15位身份证：6位地区码 + 6位出生日期(YYMMDD) + 3位顺序码
    const pattern15 = /^[1-9]\d{5}\d{2}((0[1-9])|(1[0-2]))(([0-2]\d)|30|31)\d{3}$/;
    // 18位身份证：6位地区码 + 8位出生日期(YYYYMMDD) + 3位顺序码 + 1位校验码
    const pattern18 = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2]\d)|30|31)\d{3}[0-9Xx]$/;
    return pattern15.test(value) || pattern18.test(value);
  },
  '必须是有效的身份证号码',
);

/**
 * 验证 IP 地址 (IPv4)
 */
export const IsIPv4 = createSimpleValidator(
  'isIPv4',
  (value) => {
    if (typeof value !== 'string') return false;
    const parts = value.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !Number.isNaN(num) && num >= 0 && num <= 255 && String(num) === part;
    });
  },
  '必须是有效的 IPv4 地址',
);

/**
 * 验证端口号
 */
export const IsPort = createSimpleValidator(
  'isPort',
  (value) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return !Number.isNaN(num) && num >= 0 && num <= 65535;
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) && value >= 0 && value <= 65535;
    }
    return false;
  },
  '必须是有效的端口号 (0-65535)',
);

/**
 * 验证邮政编码（中国）
 */
export const IsPostalCode = createSimpleValidator(
  'isPostalCode',
  (value) => typeof value === 'string' && /^[1-9]\d{5}$/.test(value),
  '必须是有效的邮政编码',
);

/**
 * 验证信用卡号（Luhn 算法）
 */
export const IsCreditCard = createSimpleValidator(
  'isCreditCard',
  (value) => {
    if (typeof value !== 'string') return false;
    const sanitized = value.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(sanitized)) return false;

    // Luhn 算法
    let sum = 0;
    let isEven = false;
    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  },
  '必须是有效的信用卡号',
);

/**
 * 验证十六进制颜色值
 */
export const IsHexColor = createSimpleValidator(
  'isHexColor',
  (value) => typeof value === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value),
  '必须是有效的十六进制颜色值',
);

/**
 * 验证 MAC 地址
 */
export const IsMacAddress = createSimpleValidator(
  'isMacAddress',
  (value) =>
    typeof value === 'string' &&
    /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(value),
  '必须是有效的 MAC 地址',
);

/**
 * 验证语义化版本号
 */
export const IsSemVer = createSimpleValidator(
  'isSemVer',
  (value) =>
    typeof value === 'string' &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(
      value,
    ),
  '必须是有效的语义化版本号',
);

/**
 * 创建能被指定数字整除的验证器
 */
export const IsDivisibleBy = createCustomValidator(
  'isDivisibleBy',
  (value: unknown, divisor: number) =>
    typeof value === 'number' && !Number.isNaN(value) && value % divisor === 0,
  (divisor: number) => `必须能被 ${divisor} 整除`,
);

/**
 * 创建范围验证器
 */
export const IsBetween = createCustomValidator(
  'isBetween',
  (value: unknown, min: number, max: number) =>
    typeof value === 'number' && value >= min && value <= max,
  (min: number, max: number) => `必须在 ${min} 和 ${max} 之间`,
);

/**
 * 验证是否包含指定子字符串
 */
export const Contains = createCustomValidator(
  'contains',
  (value: unknown, substring: string) =>
    typeof value === 'string' && value.includes(substring),
  (substring: string) => `必须包含 "${substring}"`,
);

/**
 * 验证是否不包含指定子字符串
 */
export const NotContains = createCustomValidator(
  'notContains',
  (value: unknown, substring: string) =>
    typeof value === 'string' && !value.includes(substring),
  (substring: string) => `不能包含 "${substring}"`,
);
