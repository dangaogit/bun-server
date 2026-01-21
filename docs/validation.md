# Validation System

Bun Server Framework provides a powerful validation system for validating request parameters, DTOs, and complex data structures.

## Table of Contents

- [Basic Validation](#basic-validation)
- [Validation Rules](#validation-rules)
  - [Object Rules](#object-rules)
  - [Array Rules](#array-rules)
  - [Common Rules](#common-rules)
  - [Conditional Rules](#conditional-rules)
- [Class-Level Validation](#class-level-validation)
- [Nested Object Validation](#nested-object-validation)
- [Custom Validators](#custom-validators)
- [Built-in Extended Validators](#built-in-extended-validators)
- [Error Handling](#error-handling)

## Basic Validation

Use the `@Validate()` decorator on controller method parameters:

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

## Validation Rules

### Object Rules

```typescript
import { IsObject, IsNotEmpty, IsNotEmptyObject, ValidateNested } from '@dangao/bun-server';

// Validate value is an object
IsObject()

// Validate value is not empty (null, undefined, empty string, empty array, empty object)
IsNotEmpty()

// Validate value is a non-empty object
IsNotEmptyObject()

// Mark property for nested validation
ValidateNested({ each?: boolean })  // each: true for array elements
```

### Array Rules

```typescript
import { 
  IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique, 
  ArrayContains, ArrayNotContains, ArrayNotEmpty 
} from '@dangao/bun-server';

// Validate value is an array
IsArray()

// Validate array minimum length
ArrayMinSize(2)

// Validate array maximum length
ArrayMaxSize(10)

// Validate array elements are unique
ArrayUnique()

// Validate array contains specific values
ArrayContains([1, 2])

// Validate array does not contain specific values
ArrayNotContains(['banned'])

// Validate array is not empty
ArrayNotEmpty()
```

### Common Rules

```typescript
import {
  IsString, IsNumber, IsBoolean, IsInt, IsPositive, IsNegative,
  Min, Max, IsDate, IsUUID, Length, MaxLength, MinLength,
  Matches, IsIn, IsNotIn, IsUrl, IsJSON, IsEmail,
  Equals, NotEquals, IsDefined, IsAlphanumeric, IsAlpha, IsNumberString
} from '@dangao/bun-server';

// Type validation
IsString()
IsNumber()
IsBoolean()
IsInt()
IsDate()

// Number validation
IsPositive()
IsNegative()
Min(0)
Max(100)

// String validation
IsEmail()
IsUUID('4')  // '3', '4', '5', or 'all'
Length(2, 10)
MinLength(2)
MaxLength(10)
Matches(/^[a-z]+$/)
IsUrl()
IsJSON()
IsAlphanumeric()
IsAlpha()
IsNumberString()

// Value validation
IsIn(['a', 'b', 'c'])
IsNotIn(['x', 'y', 'z'])
Equals('expected')
NotEquals('forbidden')
IsDefined()
```

### Conditional Rules

```typescript
import { ValidateIf, Transform } from '@dangao/bun-server';

// Conditional validation - only validate when condition is true
ValidateIf((value, obj) => obj.type === 'premium')

// Transform value before validation
Transform((value) => String(value).trim())
Transform((value) => Number(value))
```

Example usage:

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

## Class-Level Validation

For DTO classes, use `@ValidateClass()` and `@Property()` decorators:

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

Validate objects manually:

```typescript
import { validateObject, validateObjectSync, ValidationError } from '@dangao/bun-server';

// Throws ValidationError on failure
try {
  validateObject(data, CreateUserDto);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.issues);
  }
}

// Returns validation result without throwing
const result = validateObjectSync(data, CreateUserDto);
if (!result.valid) {
  console.log(result.issues);
}
```

## Nested Object Validation

For nested objects and arrays:

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

  // Nested object validation
  @NestedProperty(AddressDto)
  shippingAddress: AddressDto;

  // Array of nested objects validation
  @Property(IsArray(), ArrayMinSize(1))
  @ArrayNestedProperty(ItemDto)
  items: ItemDto[];
}
```

## Custom Validators

### Simple Custom Validator

```typescript
import { createSimpleValidator } from '@dangao/bun-server';

const IsEven = createSimpleValidator(
  'isEven',
  (value) => typeof value === 'number' && value % 2 === 0,
  'Must be an even number'
);

// Usage
@Property(IsEven())
count: number;
```

### Parameterized Custom Validator

```typescript
import { createCustomValidator } from '@dangao/bun-server';

const IsDivisibleBy = createCustomValidator(
  'isDivisibleBy',
  (value: unknown, divisor: number) => typeof value === 'number' && value % divisor === 0,
  (divisor: number) => `Must be divisible by ${divisor}`
);

// Usage
@Property(IsDivisibleBy(5)())
value: number;
```

### Regex Custom Validator

```typescript
import { createRegexValidator } from '@dangao/bun-server';

const IsSlug = createRegexValidator(
  'isSlug',
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Must be a valid slug format'
);

// Usage
@Property(IsSlug())
slug: string;
```

## Built-in Extended Validators

The framework provides several pre-built validators for common use cases:

```typescript
import {
  IsPhoneNumber,    // Chinese phone number
  IsIdCard,         // Chinese ID card
  IsIPv4,           // IPv4 address
  IsPort,           // Port number (0-65535)
  IsPostalCode,     // Chinese postal code
  IsCreditCard,     // Credit card (Luhn algorithm)
  IsHexColor,       // Hex color (#fff or #ffffff)
  IsMacAddress,     // MAC address
  IsSemVer,         // Semantic version
  IsDivisibleBy,    // Divisible by number
  IsBetween,        // Number in range
  Contains,         // String contains substring
  NotContains,      // String does not contain substring
} from '@dangao/bun-server';

// Usage examples
@Property(IsPhoneNumber())
phone: string;

@Property(IsIPv4())
ip: string;

@Property(IsBetween(1, 100)())
percentage: number;

@Property(Contains('http')())
url: string;
```

## Error Handling

### ValidationError

When validation fails, a `ValidationError` is thrown:

```typescript
import { ValidationError, ValidationIssue } from '@dangao/bun-server';

try {
  validateObject(data, MyDto);
} catch (error) {
  if (error instanceof ValidationError) {
    // Access validation issues
    console.log(error.issues);
    
    // Get flattened errors (useful for nested objects)
    console.log(error.getFlattened());
    
    // Convert to JSON
    console.log(error.toJSON());
  }
}
```

### ValidationIssue Structure

```typescript
interface ValidationIssue {
  index?: number;       // Parameter index (for parameter validation)
  property?: string;    // Property path (e.g., 'user.address.city')
  rule: string;         // Failed rule name
  message: string;      // Error message
  value?: unknown;      // The value that failed validation
  children?: ValidationIssue[];  // Nested errors
}
```

### Controller Integration

Validation errors are automatically caught and returned as 400 Bad Request responses:

```typescript
@Controller('/api/users')
class UserController {
  @POST('/')
  public async createUser(@Body() @Validate(IsObject()) body: unknown) {
    const dto = body as CreateUserDto;
    validateObject(dto, CreateUserDto);
    // ... create user
  }
}
```

## Best Practices

1. **Use DTOs for complex validation**: For request bodies with multiple fields, use `@ValidateClass()` decorated DTOs.

2. **Combine rules**: Chain multiple rules for comprehensive validation:
   ```typescript
   @Property(IsString(), MinLength(2), MaxLength(50), Matches(/^[a-zA-Z\s]+$/))
   name: string;
   ```

3. **Use IsOptional() first**: Always place `IsOptional()` at the beginning of the rule chain:
   ```typescript
   @Property(IsOptional(), IsString(), MinLength(2))
   nickname?: string;
   ```

4. **Transform before validate**: Use `Transform()` to normalize data before validation:
   ```typescript
   @Property(Transform((v) => String(v).toLowerCase().trim()), IsEmail())
   email: string;
   ```

5. **Custom error messages**: Provide clear, user-friendly error messages:
   ```typescript
   IsEmail({ message: 'Please enter a valid email address' })
   ```
