import type { ValidationRuleDefinition } from '../types';

export interface ConditionalRuleOptions {
  message?: string;
}

/**
 * 条件验证装饰器
 * 只有当条件函数返回 true 时才执行后续验证
 *
 * @example
 * class UpdateUserDto {
 *   @Validate(ValidateIf((value, obj) => obj.type === 'premium'), IsEmail())
 *   email?: string;
 * }
 */
export function ValidateIf(
  condition: (value: unknown, obj?: unknown) => boolean,
  options: ConditionalRuleOptions = {},
): ValidationRuleDefinition {
  return {
    name: 'validateIf',
    message: options.message ?? '',
    condition,
    validate: () => true, // 条件验证本身总是通过，由 condition 控制是否执行后续规则
  };
}

/**
 * 转换装饰器
 * 在验证前转换值
 *
 * @example
 * class CreateUserDto {
 *   @Validate(Transform((value) => value?.trim()), IsString())
 *   name: string;
 *
 *   @Validate(Transform((value) => Number(value)), IsInt(), Min(0))
 *   age: number;
 * }
 */
export function Transform(
  transformFn: (value: unknown) => unknown,
  options: ConditionalRuleOptions = {},
): ValidationRuleDefinition {
  return {
    name: 'transform',
    message: options.message ?? '',
    transform: transformFn,
    validate: () => true, // Transform 本身不验证，只转换
  };
}
