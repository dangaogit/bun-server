import 'reflect-metadata';
import type { ValidationRuleDefinition, ValidationMetadata } from './types';

const VALIDATION_METADATA_KEY = Symbol('validation:param');

function getOrCreateMetadata(target: object, propertyKey: string | symbol): ValidationMetadata[] {
  const existing = Reflect.getMetadata(VALIDATION_METADATA_KEY, target, propertyKey) as
    | ValidationMetadata[]
    | undefined;
  if (existing) {
    return existing;
  }
  const metadata: ValidationMetadata[] = [];
  Reflect.defineMetadata(VALIDATION_METADATA_KEY, metadata, target, propertyKey);
  return metadata;
}

/**
 * 通用校验装饰器
 * @param rules - 校验规则
 */
export function Validate(...rules: ValidationRuleDefinition[]): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    if (!propertyKey) {
      throw new Error('@Validate decorator can only be used on methods');
    }
    if (!rules.length) {
      throw new Error('@Validate requires at least one validation rule');
    }
    const metadata = getOrCreateMetadata(target, propertyKey);
    let entry = metadata.find((item) => item.index === parameterIndex);
    if (!entry) {
      entry = { index: parameterIndex, rules: [] };
      metadata.push(entry);
    }
    entry.rules.push(...rules);
  };
}

export interface RuleOption {
  message?: string;
}

export function IsString(options: RuleOption = {}): ValidationRuleDefinition {
  return {
    name: 'isString',
    message: options.message ?? '必须是字符串',
    validate: (value) => typeof value === 'string',
  };
}

export function IsNumber(options: RuleOption = {}): ValidationRuleDefinition {
  return {
    name: 'isNumber',
    message: options.message ?? '必须是数字',
    validate: (value) => typeof value === 'number' && !Number.isNaN(value),
  };
}

export function IsEmail(options: RuleOption = {}): ValidationRuleDefinition {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    name: 'isEmail',
    message: options.message ?? '必须是合法的邮箱地址',
    validate: (value) => typeof value === 'string' && emailRegex.test(value),
  };
}

export function IsOptional(): ValidationRuleDefinition {
  return {
    name: 'isOptional',
    message: '',
    optional: true,
    validate: () => true,
  };
}

export function MinLength(min: number, options: RuleOption = {}): ValidationRuleDefinition {
  return {
    name: 'minLength',
    message: options.message ?? `长度不能小于 ${min}`,
    validate: (value) => typeof value === 'string' && value.length >= min,
  };
}

/**
 * 获取方法参数的验证元数据
 */
export function getValidationMetadata(target: object, propertyKey: string | symbol): ValidationMetadata[] {
  return (
    (Reflect.getMetadata(VALIDATION_METADATA_KEY, target, propertyKey) as ValidationMetadata[]) || []
  );
}


