# 验证系统

Bun Server Framework 提供了强大的验证系统，用于验证请求参数、DTO 和复杂数据结构。

## 目录

- [基础验证](#基础验证)
- [验证规则](#验证规则)
  - [对象规则](#对象规则)
  - [数组规则](#数组规则)
  - [通用规则](#通用规则)
  - [条件规则](#条件规则)
- [类级别验证](#类级别验证)
- [嵌套对象验证](#嵌套对象验证)
- [自定义验证器](#自定义验证器)
- [内置扩展验证器](#内置扩展验证器)
- [错误处理](#错误处理)

## 基础验证

在控制器方法参数上使用 `@Validate()` 装饰器：

```typescript
import { Controller, GET, Query, Validate, IsString, IsEmail, IsOptional, MinLength } from '@dangao/bun-server';

@Controller('/api/users')
class UserController {
  @GET('/search')
  public search(
    @Query('email') @Validate(IsEmail()) email: string,
    @Query('name') @Validate(IsOptional(), IsString(), MinLength(2)) name?: string,
  ) {
    return { email, name };
  }
}
```

## 验证规则

### 对象规则

```typescript
import { IsObject, IsNotEmpty, IsNotEmptyObject, ValidateNested } from '@dangao/bun-server';

// 验证值是否为对象
IsObject()

// 验证值是否非空（null、undefined、空字符串、空数组、空对象）
IsNotEmpty()

// 验证值是否为非空对象
IsNotEmptyObject()

// 标记属性需要嵌套验证
ValidateNested({ each?: boolean })  // each: true 用于数组元素
```

### 数组规则

```typescript
import { 
  IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique, 
  ArrayContains, ArrayNotContains, ArrayNotEmpty 
} from '@dangao/bun-server';

// 验证值是否为数组
IsArray()

// 验证数组最小长度
ArrayMinSize(2)

// 验证数组最大长度
ArrayMaxSize(10)

// 验证数组元素是否唯一
ArrayUnique()

// 验证数组是否包含指定值
ArrayContains([1, 2])

// 验证数组是否不包含指定值
ArrayNotContains(['banned'])

// 验证数组是否非空
ArrayNotEmpty()
```

### 通用规则

```typescript
import {
  IsString, IsNumber, IsBoolean, IsInt, IsPositive, IsNegative,
  Min, Max, IsDate, IsUUID, Length, MaxLength, MinLength,
  Matches, IsIn, IsNotIn, IsUrl, IsJSON, IsEmail,
  Equals, NotEquals, IsDefined, IsAlphanumeric, IsAlpha, IsNumberString
} from '@dangao/bun-server';

// 类型验证
IsString()
IsNumber()
IsBoolean()
IsInt()
IsDate()

// 数字验证
IsPositive()
IsNegative()
Min(0)
Max(100)

// 字符串验证
IsEmail()
IsUUID('4')  // '3', '4', '5', 或 'all'
Length(2, 10)
MinLength(2)
MaxLength(10)
Matches(/^[a-z]+$/)
IsUrl()
IsJSON()
IsAlphanumeric()
IsAlpha()
IsNumberString()

// 值验证
IsIn(['a', 'b', 'c'])
IsNotIn(['x', 'y', 'z'])
Equals('expected')
NotEquals('forbidden')
IsDefined()
```

### 条件规则

```typescript
import { ValidateIf, Transform } from '@dangao/bun-server';

// 条件验证 - 仅当条件为 true 时执行验证
ValidateIf((value, obj) => obj.type === 'premium')

// 验证前转换值
Transform((value) => String(value).trim())
Transform((value) => Number(value))
```

使用示例：

```typescript
@ValidateClass()
class UpdateUserDto {
  @Property(ValidateIf((_, obj) => obj.type === 'premium'), IsEmail())
  premiumEmail?: string;

  @Property(Transform((v) => String(v).trim()), IsString(), MinLength(1))
  name: string;

  @Property(Transform((v) => Number(v)), IsInt(), Min(0))
  age: number;
}
```

## 类级别验证

对于 DTO 类，使用 `@ValidateClass()` 和 `@Property()` 装饰器：

```typescript
import { ValidateClass, Property, IsString, IsEmail, IsOptional, IsInt, Min, Max, MinLength } from '@dangao/bun-server';

@ValidateClass()
class CreateUserDto {
  @Property(IsString(), MinLength(2))
  name: string;

  @Property(IsEmail())
  email: string;

  @Property(IsOptional(), IsInt(), Min(0), Max(150))
  age?: number;
}
```

手动验证对象：

```typescript
import { validateObject, validateObjectSync, ValidationError } from '@dangao/bun-server';

// 失败时抛出 ValidationError
try {
  validateObject(data, CreateUserDto);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.issues);
  }
}

// 返回验证结果而不抛出异常
const result = validateObjectSync(data, CreateUserDto);
if (!result.valid) {
  console.log(result.issues);
}
```

## 嵌套对象验证

用于嵌套对象和数组：

```typescript
import { ValidateClass, Property, NestedProperty, ArrayNestedProperty, IsString, IsNumber, Min, IsArray, ArrayMinSize } from '@dangao/bun-server';

@ValidateClass()
class AddressDto {
  @Property(IsString())
  city: string;

  @Property(IsString())
  street: string;
}

@ValidateClass()
class ItemDto {
  @Property(IsString())
  name: string;

  @Property(IsNumber(), Min(0))
  price: number;
}

@ValidateClass()
class CreateOrderDto {
  @Property(IsString())
  userId: string;

  // 嵌套对象验证
  @NestedProperty(AddressDto)
  shippingAddress: AddressDto;

  // 嵌套对象数组验证
  @Property(IsArray(), ArrayMinSize(1))
  @ArrayNestedProperty(ItemDto)
  items: ItemDto[];
}
```

## 自定义验证器

### 简单自定义验证器

```typescript
import { createSimpleValidator } from '@dangao/bun-server';

const IsEven = createSimpleValidator(
  'isEven',
  (value) => typeof value === 'number' && value % 2 === 0,
  '必须是偶数'
);

// 使用
@Property(IsEven())
count: number;
```

### 带参数的自定义验证器

```typescript
import { createCustomValidator } from '@dangao/bun-server';

const IsDivisibleBy = createCustomValidator(
  'isDivisibleBy',
  (value: unknown, divisor: number) => typeof value === 'number' && value % divisor === 0,
  (divisor: number) => `必须能被 ${divisor} 整除`
);

// 使用
@Property(IsDivisibleBy(5)())
value: number;
```

### 正则表达式自定义验证器

```typescript
import { createRegexValidator } from '@dangao/bun-server';

const IsSlug = createRegexValidator(
  'isSlug',
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  '必须是有效的 slug 格式'
);

// 使用
@Property(IsSlug())
slug: string;
```

## 内置扩展验证器

框架提供了多个预置验证器用于常见场景：

```typescript
import {
  IsPhoneNumber,    // 中国手机号
  IsIdCard,         // 中国身份证号
  IsIPv4,           // IPv4 地址
  IsPort,           // 端口号 (0-65535)
  IsPostalCode,     // 中国邮政编码
  IsCreditCard,     // 信用卡号（Luhn 算法）
  IsHexColor,       // 十六进制颜色值（#fff 或 #ffffff）
  IsMacAddress,     // MAC 地址
  IsSemVer,         // 语义化版本号
  IsDivisibleBy,    // 能被指定数字整除
  IsBetween,        // 数字在范围内
  Contains,         // 字符串包含子串
  NotContains,      // 字符串不包含子串
} from '@dangao/bun-server';

// 使用示例
@Property(IsPhoneNumber())
phone: string;

@Property(IsIPv4())
ip: string;

@Property(IsBetween(1, 100)())
percentage: number;

@Property(Contains('http')())
url: string;
```

## 错误处理

### ValidationError

验证失败时会抛出 `ValidationError`：

```typescript
import { ValidationError, ValidationIssue } from '@dangao/bun-server';

try {
  validateObject(data, MyDto);
} catch (error) {
  if (error instanceof ValidationError) {
    // 访问验证问题列表
    console.log(error.issues);
    
    // 获取扁平化的错误（对嵌套对象有用）
    console.log(error.getFlattened());
    
    // 转换为 JSON
    console.log(error.toJSON());
  }
}
```

### ValidationIssue 结构

```typescript
interface ValidationIssue {
  index?: number;       // 参数索引（用于参数验证）
  property?: string;    // 属性路径（如 'user.address.city'）
  rule: string;         // 失败的规则名称
  message: string;      // 错误消息
  value?: unknown;      // 验证失败的值
  children?: ValidationIssue[];  // 嵌套错误
}
```

### 控制器集成

验证错误会被自动捕获并返回 400 Bad Request 响应：

```typescript
@Controller('/api/users')
class UserController {
  @POST('/')
  public async createUser(@Body() @Validate(IsObject()) body: unknown) {
    const dto = body as CreateUserDto;
    validateObject(dto, CreateUserDto);
    // ... 创建用户
  }
}
```

## 最佳实践

1. **复杂验证使用 DTO**：对于具有多个字段的请求体，使用 `@ValidateClass()` 装饰的 DTO。

2. **组合规则**：链式组合多个规则以进行全面验证：
   ```typescript
   @Property(IsString(), MinLength(2), MaxLength(50), Matches(/^[a-zA-Z\s]+$/))
   name: string;
   ```

3. **IsOptional() 放在最前**：始终将 `IsOptional()` 放在规则链的开头：
   ```typescript
   @Property(IsOptional(), IsString(), MinLength(2))
   nickname?: string;
   ```

4. **先转换后验证**：使用 `Transform()` 在验证前规范化数据：
   ```typescript
   @Property(Transform((v) => String(v).toLowerCase().trim()), IsEmail())
   email: string;
   ```

5. **自定义错误消息**：提供清晰、用户友好的错误消息：
   ```typescript
   IsEmail({ message: '请输入有效的邮箱地址' })
   ```
