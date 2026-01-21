import 'reflect-metadata';
import type { ValidationRuleDefinition, ClassValidationMetadata, ValidationOptions } from './types';
import { ValidationError, type ValidationIssue } from './errors';

const CLASS_VALIDATION_METADATA_KEY = Symbol('validation:class');
const PROPERTY_VALIDATION_METADATA_KEY = Symbol('validation:property');
const VALIDATE_CLASS_METADATA_KEY = Symbol('validation:validateClass');

/**
 * 标记类需要验证
 * 应用此装饰器后，类的实例可以使用 validateObject 函数进行验证
 */
export function ValidateClass(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(VALIDATE_CLASS_METADATA_KEY, true, target);
  };
}

/**
 * 属性验证装饰器
 * 用于 DTO 类的属性级别验证
 *
 * @example
 * @ValidateClass()
 * class CreateUserDto {
 *   @Property(IsString(), MinLength(2))
 *   name: string;
 *
 *   @Property(IsEmail())
 *   email: string;
 *
 *   @Property(IsOptional(), IsNumber())
 *   age?: number;
 * }
 */
export function Property(...rules: ValidationRuleDefinition[]): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey === 'symbol') {
      throw new Error('@Property decorator does not support symbol property keys');
    }

    // 获取或创建类级别的元数据数组
    const existingMetadata: ClassValidationMetadata[] =
      Reflect.getMetadata(CLASS_VALIDATION_METADATA_KEY, target.constructor) ?? [];

    // 查找现有的属性元数据
    let propertyMetadata = existingMetadata.find((m) => m.property === propertyKey);
    if (!propertyMetadata) {
      propertyMetadata = { property: propertyKey, rules: [] };
      existingMetadata.push(propertyMetadata);
    }

    // 添加规则
    propertyMetadata.rules.push(...rules);

    // 保存元数据
    Reflect.defineMetadata(CLASS_VALIDATION_METADATA_KEY, existingMetadata, target.constructor);
  };
}

/**
 * 获取类的验证元数据
 */
export function getClassValidationMetadata(target: new () => unknown): ClassValidationMetadata[] {
  return Reflect.getMetadata(CLASS_VALIDATION_METADATA_KEY, target) ?? [];
}

/**
 * 检查类是否标记为需要验证
 */
export function isValidateClass(target: new () => unknown): boolean {
  return Reflect.getMetadata(VALIDATE_CLASS_METADATA_KEY, target) === true;
}

/**
 * 验证单个值
 */
function validateValue(
  value: unknown,
  rules: ValidationRuleDefinition[],
  property: string,
  fullObject: unknown,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let currentValue = value;
  let shouldSkip = false;

  for (const rule of rules) {
    // 处理条件验证
    if (rule.condition && !rule.condition(currentValue, fullObject)) {
      shouldSkip = true;
      break;
    }

    // 处理可选字段
    if (rule.optional && (currentValue === undefined || currentValue === null)) {
      shouldSkip = true;
      break;
    }

    // 处理转换
    if (rule.transform) {
      currentValue = rule.transform(currentValue);
    }

    // 处理嵌套验证
    if (rule.nested) {
      if (rule.each && Array.isArray(currentValue)) {
        // 数组嵌套验证
        for (let i = 0; i < currentValue.length; i++) {
          const item = currentValue[i];
          if (typeof item === 'object' && item !== null && rule.nestedType) {
            const nestedIssues = validateObjectInternal(item, rule.nestedType, `${property}[${i}]`);
            issues.push(...nestedIssues);
          }
        }
      } else if (typeof currentValue === 'object' && currentValue !== null && rule.nestedType) {
        // 单个对象嵌套验证
        const nestedIssues = validateObjectInternal(currentValue, rule.nestedType, property);
        issues.push(...nestedIssues);
      }
      continue;
    }

    // 执行验证
    const passed = rule.validate(currentValue, fullObject);
    if (!passed) {
      issues.push({
        property,
        rule: rule.name,
        message: rule.message,
        value: currentValue,
      });
    }
  }

  return shouldSkip ? [] : issues;
}

/**
 * 内部验证函数
 */
function validateObjectInternal(
  obj: unknown,
  targetClass: new () => unknown,
  prefix = '',
): ValidationIssue[] {
  const metadata = getClassValidationMetadata(targetClass);
  const issues: ValidationIssue[] = [];

  if (typeof obj !== 'object' || obj === null) {
    issues.push({
      property: prefix || 'root',
      rule: 'isObject',
      message: '必须是对象',
      value: obj,
    });
    return issues;
  }

  const objRecord = obj as Record<string, unknown>;

  for (const meta of metadata) {
    const propertyPath = prefix ? `${prefix}.${meta.property}` : meta.property;
    const value = objRecord[meta.property];
    const propertyIssues = validateValue(value, meta.rules, propertyPath, obj);
    issues.push(...propertyIssues);
  }

  return issues;
}

/**
 * 验证对象
 *
 * @param obj - 要验证的对象
 * @param targetClass - DTO 类
 * @param options - 验证选项
 * @throws {ValidationError} 验证失败时抛出
 *
 * @example
 * @ValidateClass()
 * class CreateUserDto {
 *   @Property(IsString(), MinLength(2))
 *   name: string;
 *
 *   @Property(IsEmail())
 *   email: string;
 * }
 *
 * const dto = { name: 'A', email: 'invalid' };
 * validateObject(dto, CreateUserDto); // throws ValidationError
 */
export function validateObject<T>(
  obj: unknown,
  targetClass: new () => T,
  options: ValidationOptions = {},
): void {
  const issues = validateObjectInternal(obj, targetClass);

  if (options.stopAtFirstError && issues.length > 0) {
    throw new ValidationError('Validation failed', [issues[0]]);
  }

  if (issues.length > 0) {
    throw new ValidationError('Validation failed', issues);
  }
}

/**
 * 验证对象并返回验证结果（不抛出异常）
 *
 * @param obj - 要验证的对象
 * @param targetClass - DTO 类
 * @param options - 验证选项
 * @returns 验证结果
 */
export function validateObjectSync<T>(
  obj: unknown,
  targetClass: new () => T,
  options: ValidationOptions = {},
): { valid: boolean; issues: ValidationIssue[] } {
  const issues = validateObjectInternal(obj, targetClass);

  if (options.stopAtFirstError && issues.length > 0) {
    return { valid: false, issues: [issues[0]] };
  }

  return { valid: issues.length === 0, issues };
}

/**
 * 带嵌套类型的属性验证装饰器
 * 用于嵌套对象验证
 *
 * @example
 * @ValidateClass()
 * class AddressDto {
 *   @Property(IsString())
 *   city: string;
 * }
 *
 * @ValidateClass()
 * class CreateUserDto {
 *   @Property(IsString())
 *   name: string;
 *
 *   @NestedProperty(AddressDto)
 *   address: AddressDto;
 * }
 */
export function NestedProperty<T>(nestedClass: new () => T): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey === 'symbol') {
      throw new Error('@NestedProperty decorator does not support symbol property keys');
    }

    const existingMetadata: ClassValidationMetadata[] =
      Reflect.getMetadata(CLASS_VALIDATION_METADATA_KEY, target.constructor) ?? [];

    let propertyMetadata = existingMetadata.find((m) => m.property === propertyKey);
    if (!propertyMetadata) {
      propertyMetadata = { property: propertyKey, rules: [] };
      existingMetadata.push(propertyMetadata);
    }

    propertyMetadata.rules.push({
      name: 'validateNested',
      message: '嵌套对象验证失败',
      nested: true,
      nestedType: nestedClass,
      validate: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
    });

    Reflect.defineMetadata(CLASS_VALIDATION_METADATA_KEY, existingMetadata, target.constructor);
  };
}

/**
 * 数组嵌套属性验证装饰器
 * 用于数组中每个元素的验证
 *
 * @example
 * @ValidateClass()
 * class ItemDto {
 *   @Property(IsString())
 *   name: string;
 * }
 *
 * @ValidateClass()
 * class OrderDto {
 *   @ArrayNestedProperty(ItemDto)
 *   items: ItemDto[];
 * }
 */
export function ArrayNestedProperty<T>(nestedClass: new () => T): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey === 'symbol') {
      throw new Error('@ArrayNestedProperty decorator does not support symbol property keys');
    }

    const existingMetadata: ClassValidationMetadata[] =
      Reflect.getMetadata(CLASS_VALIDATION_METADATA_KEY, target.constructor) ?? [];

    let propertyMetadata = existingMetadata.find((m) => m.property === propertyKey);
    if (!propertyMetadata) {
      propertyMetadata = { property: propertyKey, rules: [] };
      existingMetadata.push(propertyMetadata);
    }

    propertyMetadata.rules.push({
      name: 'validateNestedArray',
      message: '数组元素验证失败',
      nested: true,
      nestedType: nestedClass,
      each: true,
      validate: (value) => Array.isArray(value),
    });

    Reflect.defineMetadata(CLASS_VALIDATION_METADATA_KEY, existingMetadata, target.constructor);
  };
}
