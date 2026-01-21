import { describe, expect, test } from 'bun:test';

import {
  // 对象规则
  IsObject,
  IsNotEmpty,
  IsNotEmptyObject,
  ValidateNested,
  // 数组规则
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  ArrayContains,
  ArrayNotContains,
  ArrayNotEmpty,
  // 通用规则
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
  // 条件规则
  ValidateIf,
  Transform,
} from '../../src/validation';

describe('Object Validation Rules', () => {
  describe('IsObject', () => {
    const rule = IsObject();

    test('should pass for plain object', () => {
      expect(rule.validate({})).toBe(true);
      expect(rule.validate({ a: 1 })).toBe(true);
    });

    test('should fail for non-objects', () => {
      expect(rule.validate(null)).toBe(false);
      expect(rule.validate(undefined)).toBe(false);
      expect(rule.validate([])).toBe(false);
      expect(rule.validate('string')).toBe(false);
      expect(rule.validate(123)).toBe(false);
    });
  });

  describe('IsNotEmpty', () => {
    const rule = IsNotEmpty();

    test('should pass for non-empty values', () => {
      expect(rule.validate('hello')).toBe(true);
      expect(rule.validate([1])).toBe(true);
      expect(rule.validate({ a: 1 })).toBe(true);
      expect(rule.validate(0)).toBe(true);
      expect(rule.validate(false)).toBe(true);
    });

    test('should fail for empty values', () => {
      expect(rule.validate(null)).toBe(false);
      expect(rule.validate(undefined)).toBe(false);
      expect(rule.validate('')).toBe(false);
      expect(rule.validate('   ')).toBe(false);
      expect(rule.validate([])).toBe(false);
      expect(rule.validate({})).toBe(false);
    });
  });

  describe('IsNotEmptyObject', () => {
    const rule = IsNotEmptyObject();

    test('should pass for non-empty object', () => {
      expect(rule.validate({ a: 1 })).toBe(true);
      expect(rule.validate({ key: 'value' })).toBe(true);
    });

    test('should fail for empty object and non-objects', () => {
      expect(rule.validate({})).toBe(false);
      expect(rule.validate(null)).toBe(false);
      expect(rule.validate([])).toBe(false);
      expect(rule.validate('string')).toBe(false);
    });
  });

  describe('ValidateNested', () => {
    test('should return nested rule definition', () => {
      const rule = ValidateNested();
      expect(rule.nested).toBe(true);
      expect(rule.each).toBe(false);
      expect(rule.validate({ a: 1 })).toBe(true);
      expect(rule.validate([])).toBe(false);
    });

    test('should support each option for arrays', () => {
      const rule = ValidateNested({ each: true });
      expect(rule.nested).toBe(true);
      expect(rule.each).toBe(true);
      expect(rule.validate([{ a: 1 }])).toBe(true);
      expect(rule.validate({ a: 1 })).toBe(false);
    });
  });
});

describe('Array Validation Rules', () => {
  describe('IsArray', () => {
    const rule = IsArray();

    test('should pass for arrays', () => {
      expect(rule.validate([])).toBe(true);
      expect(rule.validate([1, 2, 3])).toBe(true);
    });

    test('should fail for non-arrays', () => {
      expect(rule.validate({})).toBe(false);
      expect(rule.validate('string')).toBe(false);
      expect(rule.validate(null)).toBe(false);
    });
  });

  describe('ArrayMinSize', () => {
    const rule = ArrayMinSize(2);

    test('should pass for arrays with sufficient length', () => {
      expect(rule.validate([1, 2])).toBe(true);
      expect(rule.validate([1, 2, 3])).toBe(true);
    });

    test('should fail for arrays with insufficient length', () => {
      expect(rule.validate([])).toBe(false);
      expect(rule.validate([1])).toBe(false);
    });
  });

  describe('ArrayMaxSize', () => {
    const rule = ArrayMaxSize(3);

    test('should pass for arrays within limit', () => {
      expect(rule.validate([])).toBe(true);
      expect(rule.validate([1, 2, 3])).toBe(true);
    });

    test('should fail for arrays exceeding limit', () => {
      expect(rule.validate([1, 2, 3, 4])).toBe(false);
    });
  });

  describe('ArrayUnique', () => {
    const rule = ArrayUnique();

    test('should pass for arrays with unique elements', () => {
      expect(rule.validate([1, 2, 3])).toBe(true);
      expect(rule.validate(['a', 'b', 'c'])).toBe(true);
      expect(rule.validate([{ a: 1 }, { a: 2 }])).toBe(true);
    });

    test('should fail for arrays with duplicates', () => {
      expect(rule.validate([1, 1, 2])).toBe(false);
      expect(rule.validate(['a', 'a'])).toBe(false);
      expect(rule.validate([{ a: 1 }, { a: 1 }])).toBe(false);
    });
  });

  describe('ArrayContains', () => {
    const rule = ArrayContains([1, 2]);

    test('should pass when array contains all values', () => {
      expect(rule.validate([1, 2, 3])).toBe(true);
      expect(rule.validate([2, 1])).toBe(true);
    });

    test('should fail when array does not contain all values', () => {
      expect(rule.validate([1])).toBe(false);
      expect(rule.validate([3, 4])).toBe(false);
    });
  });

  describe('ArrayNotContains', () => {
    const rule = ArrayNotContains([1, 2]);

    test('should pass when array does not contain values', () => {
      expect(rule.validate([3, 4, 5])).toBe(true);
    });

    test('should fail when array contains any of the values', () => {
      expect(rule.validate([1, 3])).toBe(false);
      expect(rule.validate([2, 4])).toBe(false);
    });
  });

  describe('ArrayNotEmpty', () => {
    const rule = ArrayNotEmpty();

    test('should pass for non-empty arrays', () => {
      expect(rule.validate([1])).toBe(true);
    });

    test('should fail for empty arrays', () => {
      expect(rule.validate([])).toBe(false);
    });
  });
});

describe('Common Validation Rules', () => {
  describe('IsBoolean', () => {
    const rule = IsBoolean();

    test('should pass for booleans', () => {
      expect(rule.validate(true)).toBe(true);
      expect(rule.validate(false)).toBe(true);
    });

    test('should fail for non-booleans', () => {
      expect(rule.validate(1)).toBe(false);
      expect(rule.validate('true')).toBe(false);
      expect(rule.validate(null)).toBe(false);
    });
  });

  describe('IsInt', () => {
    const rule = IsInt();

    test('should pass for integers', () => {
      expect(rule.validate(0)).toBe(true);
      expect(rule.validate(42)).toBe(true);
      expect(rule.validate(-10)).toBe(true);
    });

    test('should fail for non-integers', () => {
      expect(rule.validate(3.14)).toBe(false);
      expect(rule.validate('42')).toBe(false);
      expect(rule.validate(NaN)).toBe(false);
    });
  });

  describe('IsPositive', () => {
    const rule = IsPositive();

    test('should pass for positive numbers', () => {
      expect(rule.validate(1)).toBe(true);
      expect(rule.validate(0.1)).toBe(true);
    });

    test('should fail for non-positive numbers', () => {
      expect(rule.validate(0)).toBe(false);
      expect(rule.validate(-1)).toBe(false);
    });
  });

  describe('IsNegative', () => {
    const rule = IsNegative();

    test('should pass for negative numbers', () => {
      expect(rule.validate(-1)).toBe(true);
      expect(rule.validate(-0.1)).toBe(true);
    });

    test('should fail for non-negative numbers', () => {
      expect(rule.validate(0)).toBe(false);
      expect(rule.validate(1)).toBe(false);
    });
  });

  describe('Min', () => {
    const rule = Min(5);

    test('should pass for numbers >= min', () => {
      expect(rule.validate(5)).toBe(true);
      expect(rule.validate(10)).toBe(true);
    });

    test('should fail for numbers < min', () => {
      expect(rule.validate(4)).toBe(false);
      expect(rule.validate(-1)).toBe(false);
    });
  });

  describe('Max', () => {
    const rule = Max(10);

    test('should pass for numbers <= max', () => {
      expect(rule.validate(10)).toBe(true);
      expect(rule.validate(5)).toBe(true);
    });

    test('should fail for numbers > max', () => {
      expect(rule.validate(11)).toBe(false);
    });
  });

  describe('IsDate', () => {
    const rule = IsDate();

    test('should pass for valid dates', () => {
      expect(rule.validate(new Date())).toBe(true);
      expect(rule.validate('2023-01-01')).toBe(true);
      expect(rule.validate(1672531200000)).toBe(true);
    });

    test('should fail for invalid dates', () => {
      expect(rule.validate('invalid')).toBe(false);
      expect(rule.validate(new Date('invalid'))).toBe(false);
      expect(rule.validate(null)).toBe(false);
    });
  });

  describe('IsUUID', () => {
    test('should validate UUID v4', () => {
      const rule = IsUUID('4');
      expect(rule.validate('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(rule.validate('invalid-uuid')).toBe(false);
    });

    test('should validate any UUID version', () => {
      const rule = IsUUID('all');
      expect(rule.validate('550e8400-e29b-11d4-a716-446655440000')).toBe(true);
      expect(rule.validate('550e8400-e29b-21d4-a716-446655440000')).toBe(true);
    });
  });

  describe('Length', () => {
    test('should validate min length', () => {
      const rule = Length(2);
      expect(rule.validate('ab')).toBe(true);
      expect(rule.validate('a')).toBe(false);
    });

    test('should validate min and max length', () => {
      const rule = Length(2, 5);
      expect(rule.validate('ab')).toBe(true);
      expect(rule.validate('abcde')).toBe(true);
      expect(rule.validate('a')).toBe(false);
      expect(rule.validate('abcdef')).toBe(false);
    });
  });

  describe('MaxLength', () => {
    const rule = MaxLength(5);

    test('should pass for strings within limit', () => {
      expect(rule.validate('hello')).toBe(true);
      expect(rule.validate('hi')).toBe(true);
    });

    test('should fail for strings exceeding limit', () => {
      expect(rule.validate('hello!')).toBe(false);
    });
  });

  describe('Matches', () => {
    const rule = Matches(/^\d{3}-\d{4}$/);

    test('should pass for matching strings', () => {
      expect(rule.validate('123-4567')).toBe(true);
    });

    test('should fail for non-matching strings', () => {
      expect(rule.validate('1234567')).toBe(false);
      expect(rule.validate('abc-defg')).toBe(false);
    });
  });

  describe('IsIn', () => {
    const rule = IsIn(['a', 'b', 'c']);

    test('should pass for values in list', () => {
      expect(rule.validate('a')).toBe(true);
      expect(rule.validate('b')).toBe(true);
    });

    test('should fail for values not in list', () => {
      expect(rule.validate('d')).toBe(false);
      expect(rule.validate(1)).toBe(false);
    });
  });

  describe('IsNotIn', () => {
    const rule = IsNotIn(['x', 'y', 'z']);

    test('should pass for values not in list', () => {
      expect(rule.validate('a')).toBe(true);
    });

    test('should fail for values in list', () => {
      expect(rule.validate('x')).toBe(false);
    });
  });

  describe('IsUrl', () => {
    const rule = IsUrl();

    test('should pass for valid URLs', () => {
      expect(rule.validate('https://example.com')).toBe(true);
      expect(rule.validate('http://localhost:3000')).toBe(true);
    });

    test('should fail for invalid URLs', () => {
      expect(rule.validate('not-a-url')).toBe(false);
      expect(rule.validate('example.com')).toBe(false);
    });
  });

  describe('IsJSON', () => {
    const rule = IsJSON();

    test('should pass for valid JSON strings', () => {
      expect(rule.validate('{"a":1}')).toBe(true);
      expect(rule.validate('[]')).toBe(true);
      expect(rule.validate('"string"')).toBe(true);
    });

    test('should fail for invalid JSON strings', () => {
      expect(rule.validate('{a:1}')).toBe(false);
      expect(rule.validate('undefined')).toBe(false);
    });
  });

  describe('Equals', () => {
    const rule = Equals('test');

    test('should pass for equal values', () => {
      expect(rule.validate('test')).toBe(true);
    });

    test('should fail for non-equal values', () => {
      expect(rule.validate('other')).toBe(false);
    });
  });

  describe('NotEquals', () => {
    const rule = NotEquals('test');

    test('should pass for non-equal values', () => {
      expect(rule.validate('other')).toBe(true);
    });

    test('should fail for equal values', () => {
      expect(rule.validate('test')).toBe(false);
    });
  });

  describe('IsDefined', () => {
    const rule = IsDefined();

    test('should pass for defined values', () => {
      expect(rule.validate('')).toBe(true);
      expect(rule.validate(0)).toBe(true);
      expect(rule.validate(false)).toBe(true);
    });

    test('should fail for null or undefined', () => {
      expect(rule.validate(null)).toBe(false);
      expect(rule.validate(undefined)).toBe(false);
    });
  });

  describe('IsAlphanumeric', () => {
    const rule = IsAlphanumeric();

    test('should pass for alphanumeric strings', () => {
      expect(rule.validate('abc123')).toBe(true);
      expect(rule.validate('ABC')).toBe(true);
    });

    test('should fail for non-alphanumeric strings', () => {
      expect(rule.validate('abc-123')).toBe(false);
      expect(rule.validate('abc 123')).toBe(false);
    });
  });

  describe('IsAlpha', () => {
    const rule = IsAlpha();

    test('should pass for alphabetic strings', () => {
      expect(rule.validate('abc')).toBe(true);
      expect(rule.validate('ABC')).toBe(true);
    });

    test('should fail for non-alphabetic strings', () => {
      expect(rule.validate('abc123')).toBe(false);
    });
  });

  describe('IsNumberString', () => {
    const rule = IsNumberString();

    test('should pass for numeric strings', () => {
      expect(rule.validate('123')).toBe(true);
      expect(rule.validate('0')).toBe(true);
    });

    test('should fail for non-numeric strings', () => {
      expect(rule.validate('12.3')).toBe(false);
      expect(rule.validate('abc')).toBe(false);
    });
  });
});

describe('Conditional Validation Rules', () => {
  describe('ValidateIf', () => {
    test('should have condition function', () => {
      const condition = (value: unknown, obj: unknown) =>
        (obj as { type?: string })?.type === 'premium';
      const rule = ValidateIf(condition);

      expect(rule.condition).toBeDefined();
      expect(rule.condition!('value', { type: 'premium' })).toBe(true);
      expect(rule.condition!('value', { type: 'basic' })).toBe(false);
    });

    test('validate should always return true', () => {
      const rule = ValidateIf(() => false);
      expect(rule.validate('any')).toBe(true);
    });
  });

  describe('Transform', () => {
    test('should have transform function', () => {
      const rule = Transform((value) => String(value).trim());

      expect(rule.transform).toBeDefined();
      expect(rule.transform!('  hello  ')).toBe('hello');
    });

    test('validate should always return true', () => {
      const rule = Transform((value) => value);
      expect(rule.validate('any')).toBe(true);
    });
  });
});
