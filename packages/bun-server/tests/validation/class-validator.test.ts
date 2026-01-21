import { describe, expect, test } from 'bun:test';
import 'reflect-metadata';

import {
  ValidateClass,
  Property,
  NestedProperty,
  ArrayNestedProperty,
  validateObject,
  validateObjectSync,
  getClassValidationMetadata,
  isValidateClass,
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  MinLength,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
  ValidationError,
} from '../../src/validation';

describe('Class Validator', () => {
  describe('ValidateClass decorator', () => {
    test('should mark class as validate class', () => {
      @ValidateClass()
      class TestDto {
        public name: string = '';
      }

      expect(isValidateClass(TestDto)).toBe(true);
    });

    test('should return false for non-decorated class', () => {
      class TestDto {
        public name: string = '';
      }

      expect(isValidateClass(TestDto)).toBe(false);
    });
  });

  describe('Property decorator', () => {
    test('should store validation metadata', () => {
      @ValidateClass()
      class TestDto {
        @Property(IsString(), MinLength(2))
        public name: string = '';

        @Property(IsEmail())
        public email: string = '';
      }

      const metadata = getClassValidationMetadata(TestDto);
      expect(metadata.length).toBe(2);

      const nameMetadata = metadata.find((m) => m.property === 'name');
      expect(nameMetadata).toBeDefined();
      expect(nameMetadata!.rules.length).toBe(2);
      expect(nameMetadata!.rules[0].name).toBe('isString');
      expect(nameMetadata!.rules[1].name).toBe('minLength');

      const emailMetadata = metadata.find((m) => m.property === 'email');
      expect(emailMetadata).toBeDefined();
      expect(emailMetadata!.rules.length).toBe(1);
      expect(emailMetadata!.rules[0].name).toBe('isEmail');
    });
  });

  describe('validateObject', () => {
    @ValidateClass()
    class CreateUserDto {
      @Property(IsString(), MinLength(2))
      public name: string = '';

      @Property(IsEmail())
      public email: string = '';

      @Property(IsOptional(), IsInt(), Min(0), Max(150))
      public age?: number;
    }

    test('should pass for valid object', () => {
      const dto = {
        name: 'John',
        email: 'john@example.com',
        age: 25,
      };

      expect(() => validateObject(dto, CreateUserDto)).not.toThrow();
    });

    test('should pass for valid object without optional fields', () => {
      const dto = {
        name: 'John',
        email: 'john@example.com',
      };

      expect(() => validateObject(dto, CreateUserDto)).not.toThrow();
    });

    test('should throw ValidationError for invalid name', () => {
      const dto = {
        name: 'A',
        email: 'john@example.com',
      };

      expect(() => validateObject(dto, CreateUserDto)).toThrow(ValidationError);
    });

    test('should throw ValidationError for invalid email', () => {
      const dto = {
        name: 'John',
        email: 'invalid-email',
      };

      expect(() => validateObject(dto, CreateUserDto)).toThrow(ValidationError);
    });

    test('should throw ValidationError for invalid age', () => {
      const dto = {
        name: 'John',
        email: 'john@example.com',
        age: -1,
      };

      expect(() => validateObject(dto, CreateUserDto)).toThrow(ValidationError);
    });

    test('should collect all errors', () => {
      const dto = {
        name: 'A',
        email: 'invalid',
        age: -1,
      };

      try {
        validateObject(dto, CreateUserDto);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.issues.length).toBeGreaterThanOrEqual(3);
      }
    });

    test('should stop at first error when stopAtFirstError is true', () => {
      const dto = {
        name: 'A',
        email: 'invalid',
        age: -1,
      };

      try {
        validateObject(dto, CreateUserDto, { stopAtFirstError: true });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.issues.length).toBe(1);
      }
    });
  });

  describe('validateObjectSync', () => {
    @ValidateClass()
    class SimpleDto {
      @Property(IsString())
      public name: string = '';
    }

    test('should return valid: true for valid object', () => {
      const result = validateObjectSync({ name: 'test' }, SimpleDto);
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    test('should return valid: false with issues for invalid object', () => {
      const result = validateObjectSync({ name: 123 }, SimpleDto);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Nested validation', () => {
    @ValidateClass()
    class AddressDto {
      @Property(IsString(), IsNotEmpty())
      public city: string = '';

      @Property(IsString(), IsNotEmpty())
      public street: string = '';
    }

    @ValidateClass()
    class UserWithAddressDto {
      @Property(IsString(), MinLength(2))
      public name: string = '';

      @NestedProperty(AddressDto)
      public address: AddressDto = new AddressDto();
    }

    test('should validate nested object', () => {
      const dto = {
        name: 'John',
        address: {
          city: 'Beijing',
          street: 'Main St',
        },
      };

      expect(() => validateObject(dto, UserWithAddressDto)).not.toThrow();
    });

    test('should fail for invalid nested object', () => {
      const dto = {
        name: 'John',
        address: {
          city: '',
          street: 'Main St',
        },
      };

      expect(() => validateObject(dto, UserWithAddressDto)).toThrow(ValidationError);
    });

    test('should include property path in error', () => {
      const dto = {
        name: 'John',
        address: {
          city: '',
          street: '',
        },
      };

      try {
        validateObject(dto, UserWithAddressDto);
        expect(true).toBe(false);
      } catch (error) {
        const validationError = error as ValidationError;
        const cityError = validationError.issues.find((i) => i.property?.includes('city'));
        expect(cityError).toBeDefined();
      }
    });
  });

  describe('Array nested validation', () => {
    @ValidateClass()
    class ItemDto {
      @Property(IsString(), IsNotEmpty())
      public name: string = '';

      @Property(IsNumber(), Min(0))
      public price: number = 0;
    }

    @ValidateClass()
    class OrderDto {
      @Property(IsString())
      public orderId: string = '';

      @Property(IsArray(), ArrayMinSize(1))
      @ArrayNestedProperty(ItemDto)
      public items: ItemDto[] = [];
    }

    test('should validate array of nested objects', () => {
      const dto = {
        orderId: '123',
        items: [
          { name: 'Item 1', price: 10 },
          { name: 'Item 2', price: 20 },
        ],
      };

      expect(() => validateObject(dto, OrderDto)).not.toThrow();
    });

    test('should fail for invalid item in array', () => {
      const dto = {
        orderId: '123',
        items: [
          { name: 'Item 1', price: 10 },
          { name: '', price: -5 },
        ],
      };

      expect(() => validateObject(dto, OrderDto)).toThrow(ValidationError);
    });

    test('should include array index in error path', () => {
      const dto = {
        orderId: '123',
        items: [
          { name: 'Item 1', price: 10 },
          { name: '', price: 20 },
        ],
      };

      try {
        validateObject(dto, OrderDto);
        expect(true).toBe(false);
      } catch (error) {
        const validationError = error as ValidationError;
        const itemError = validationError.issues.find((i) => i.property?.includes('[1]'));
        expect(itemError).toBeDefined();
      }
    });
  });

  describe('ValidationError methods', () => {
    test('getFlattened should flatten nested errors', () => {
      const issues = [
        {
          property: 'user',
          rule: 'validateNested',
          message: 'Nested validation failed',
          children: [
            { property: 'name', rule: 'isString', message: 'Must be string' },
            { property: 'email', rule: 'isEmail', message: 'Must be email' },
          ],
        },
      ];

      const error = new ValidationError('Validation failed', issues);
      const flattened = error.getFlattened();

      expect(flattened.length).toBe(2);
      expect(flattened[0].property).toBe('user.name');
      expect(flattened[1].property).toBe('user.email');
    });

    test('toJSON should return serializable object', () => {
      const error = new ValidationError('Test error', [
        { property: 'name', rule: 'isString', message: 'Must be string' },
      ]);

      const json = error.toJSON();
      expect(json.name).toBe('ValidationError');
      expect(json.message).toBe('Test error');
      expect(json.issues).toBeDefined();
    });
  });
});
