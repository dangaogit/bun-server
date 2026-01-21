// 基础装饰器
export {
  Validate,
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  MinLength,
  getValidationMetadata,
} from './decorators';

// 类型定义
export type {
  ValidationRuleDefinition,
  ValidationMetadata,
  ClassValidationMetadata,
  ValidationOptions,
} from './types';

// 验证器
export { validateParameters } from './validator';

// 错误处理
export { ValidationError, type ValidationIssue } from './errors';

// 验证规则 - 对象
export {
  IsObject,
  IsNotEmpty,
  IsNotEmptyObject,
  ValidateNested,
  type ObjectRuleOptions,
  type ValidateNestedOptions,
} from './rules/object';

// 验证规则 - 数组
export {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  ArrayContains,
  ArrayNotContains,
  ArrayNotEmpty,
  type ArrayRuleOptions,
} from './rules/array';

// 验证规则 - 通用
export {
  IsBoolean,
  IsInt,
  IsPositive,
  IsNegative,
  Min,
  Max,
  IsDate,
  IsUUID,
  Length,
  MaxLength,
  Matches,
  IsIn,
  IsNotIn,
  IsUrl,
  IsJSON,
  Equals,
  NotEquals,
  IsDefined,
  IsAlphanumeric,
  IsAlpha,
  IsNumberString,
  type RuleOptions,
  type UUIDVersion,
} from './rules/common';

// 验证规则 - 条件和转换
export {
  ValidateIf,
  Transform,
  type ConditionalRuleOptions,
} from './rules/conditional';

// 自定义验证器
export {
  createCustomValidator,
  createSimpleValidator,
  createRegexValidator,
  // 内置扩展验证器
  IsPhoneNumber,
  IsIdCard,
  IsIPv4,
  IsPort,
  IsPostalCode,
  IsCreditCard,
  IsHexColor,
  IsMacAddress,
  IsSemVer,
  IsDivisibleBy,
  IsBetween,
  Contains,
  NotContains,
  type CustomValidatorOptions,
} from './custom-validator';

// 类级别验证
export {
  ValidateClass,
  Property,
  NestedProperty,
  ArrayNestedProperty,
  validateObject,
  validateObjectSync,
  getClassValidationMetadata,
  isValidateClass,
} from './class-validator';


