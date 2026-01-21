import { describe, expect, test } from 'bun:test';

import {
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
} from '../../src/validation';

describe('Custom Validator Factory', () => {
  describe('createCustomValidator', () => {
    test('should create validator with arguments', () => {
      const IsGreaterThan = createCustomValidator(
        'isGreaterThan',
        (value: unknown, min: number) => typeof value === 'number' && value > min,
        (min: number) => `必须大于 ${min}`,
      );

      const rule = IsGreaterThan(10)();
      expect(rule.name).toBe('isGreaterThan');
      expect(rule.message).toBe('必须大于 10');
      expect(rule.validate(11)).toBe(true);
      expect(rule.validate(10)).toBe(false);
      expect(rule.validate(5)).toBe(false);
    });

    test('should support custom message', () => {
      const IsGreaterThan = createCustomValidator(
        'isGreaterThan',
        (value: unknown, min: number) => typeof value === 'number' && value > min,
        (min: number) => `必须大于 ${min}`,
      );

      const rule = IsGreaterThan(5)({ message: 'Custom error message' });
      expect(rule.message).toBe('Custom error message');
    });

    test('should support static message', () => {
      const IsPositiveNumber = createCustomValidator(
        'isPositiveNumber',
        (value: unknown) => typeof value === 'number' && value > 0,
        '必须是正数',
      );

      const rule = IsPositiveNumber()();
      expect(rule.message).toBe('必须是正数');
    });
  });

  describe('createSimpleValidator', () => {
    test('should create simple validator without arguments', () => {
      const IsEven = createSimpleValidator(
        'isEven',
        (value) => typeof value === 'number' && value % 2 === 0,
        '必须是偶数',
      );

      const rule = IsEven();
      expect(rule.name).toBe('isEven');
      expect(rule.message).toBe('必须是偶数');
      expect(rule.validate(2)).toBe(true);
      expect(rule.validate(4)).toBe(true);
      expect(rule.validate(3)).toBe(false);
    });

    test('should support custom message', () => {
      const IsEven = createSimpleValidator(
        'isEven',
        (value) => typeof value === 'number' && value % 2 === 0,
        '必须是偶数',
      );

      const rule = IsEven({ message: 'Value must be even' });
      expect(rule.message).toBe('Value must be even');
    });
  });

  describe('createRegexValidator', () => {
    test('should create regex-based validator', () => {
      const IsSlug = createRegexValidator(
        'isSlug',
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        '必须是有效的 slug 格式',
      );

      const rule = IsSlug();
      expect(rule.name).toBe('isSlug');
      expect(rule.validate('hello-world')).toBe(true);
      expect(rule.validate('test123')).toBe(true);
      expect(rule.validate('Hello-World')).toBe(false);
      expect(rule.validate('hello_world')).toBe(false);
    });
  });
});

describe('Built-in Extended Validators', () => {
  describe('IsPhoneNumber', () => {
    const rule = IsPhoneNumber();

    test('should pass for valid Chinese phone numbers', () => {
      expect(rule.validate('13812345678')).toBe(true);
      expect(rule.validate('15912345678')).toBe(true);
      expect(rule.validate('18612345678')).toBe(true);
    });

    test('should fail for invalid phone numbers', () => {
      expect(rule.validate('12345678901')).toBe(false);
      expect(rule.validate('1381234567')).toBe(false);
      expect(rule.validate('138123456789')).toBe(false);
      expect(rule.validate('abc12345678')).toBe(false);
    });
  });

  describe('IsIdCard', () => {
    const rule = IsIdCard();

    test('should pass for valid ID cards', () => {
      // 18位身份证
      expect(rule.validate('110101199003078534')).toBe(true);
      // 15位身份证
      expect(rule.validate('110101900307853')).toBe(true);
    });

    test('should fail for invalid ID cards', () => {
      expect(rule.validate('12345678901234567')).toBe(false);
      expect(rule.validate('abc')).toBe(false);
    });
  });

  describe('IsIPv4', () => {
    const rule = IsIPv4();

    test('should pass for valid IPv4 addresses', () => {
      expect(rule.validate('192.168.1.1')).toBe(true);
      expect(rule.validate('0.0.0.0')).toBe(true);
      expect(rule.validate('255.255.255.255')).toBe(true);
    });

    test('should fail for invalid IPv4 addresses', () => {
      expect(rule.validate('256.1.1.1')).toBe(false);
      expect(rule.validate('192.168.1')).toBe(false);
      expect(rule.validate('192.168.1.1.1')).toBe(false);
      expect(rule.validate('192.168.1.01')).toBe(false); // Leading zero
    });
  });

  describe('IsPort', () => {
    const rule = IsPort();

    test('should pass for valid ports', () => {
      expect(rule.validate(0)).toBe(true);
      expect(rule.validate(80)).toBe(true);
      expect(rule.validate(443)).toBe(true);
      expect(rule.validate(65535)).toBe(true);
      expect(rule.validate('8080')).toBe(true);
    });

    test('should fail for invalid ports', () => {
      expect(rule.validate(-1)).toBe(false);
      expect(rule.validate(65536)).toBe(false);
      expect(rule.validate('abc')).toBe(false);
    });
  });

  describe('IsPostalCode', () => {
    const rule = IsPostalCode();

    test('should pass for valid Chinese postal codes', () => {
      expect(rule.validate('100000')).toBe(true);
      expect(rule.validate('518000')).toBe(true);
    });

    test('should fail for invalid postal codes', () => {
      expect(rule.validate('010000')).toBe(false); // Starts with 0
      expect(rule.validate('1000000')).toBe(false);
      expect(rule.validate('12345')).toBe(false);
    });
  });

  describe('IsCreditCard', () => {
    const rule = IsCreditCard();

    test('should pass for valid credit card numbers (Luhn check)', () => {
      expect(rule.validate('4532015112830366')).toBe(true);
      expect(rule.validate('4532-0151-1283-0366')).toBe(true);
      expect(rule.validate('4532 0151 1283 0366')).toBe(true);
    });

    test('should fail for invalid credit card numbers', () => {
      expect(rule.validate('1234567890123456')).toBe(false);
      expect(rule.validate('abc')).toBe(false);
    });
  });

  describe('IsHexColor', () => {
    const rule = IsHexColor();

    test('should pass for valid hex colors', () => {
      expect(rule.validate('#fff')).toBe(true);
      expect(rule.validate('#FFF')).toBe(true);
      expect(rule.validate('#ffffff')).toBe(true);
      expect(rule.validate('#FFFFFF')).toBe(true);
    });

    test('should fail for invalid hex colors', () => {
      expect(rule.validate('fff')).toBe(false);
      expect(rule.validate('#ffff')).toBe(false);
      expect(rule.validate('#ggg')).toBe(false);
    });
  });

  describe('IsMacAddress', () => {
    const rule = IsMacAddress();

    test('should pass for valid MAC addresses', () => {
      expect(rule.validate('00:1A:2B:3C:4D:5E')).toBe(true);
      expect(rule.validate('00-1A-2B-3C-4D-5E')).toBe(true);
      expect(rule.validate('00:1a:2b:3c:4d:5e')).toBe(true);
    });

    test('should fail for invalid MAC addresses', () => {
      expect(rule.validate('00:1A:2B:3C:4D')).toBe(false);
      expect(rule.validate('00:1A:2B:3C:4D:5E:6F')).toBe(false);
      expect(rule.validate('invalid')).toBe(false);
    });
  });

  describe('IsSemVer', () => {
    const rule = IsSemVer();

    test('should pass for valid semantic versions', () => {
      expect(rule.validate('1.0.0')).toBe(true);
      expect(rule.validate('0.0.1')).toBe(true);
      expect(rule.validate('1.0.0-alpha')).toBe(true);
      expect(rule.validate('1.0.0-alpha.1')).toBe(true);
      expect(rule.validate('1.0.0+build')).toBe(true);
      expect(rule.validate('1.0.0-alpha+build')).toBe(true);
    });

    test('should fail for invalid semantic versions', () => {
      expect(rule.validate('1.0')).toBe(false);
      expect(rule.validate('1')).toBe(false);
      expect(rule.validate('v1.0.0')).toBe(false);
      expect(rule.validate('1.0.0.0')).toBe(false);
    });
  });

  describe('IsDivisibleBy', () => {
    test('should pass when divisible', () => {
      const rule = IsDivisibleBy(5)();
      expect(rule.validate(10)).toBe(true);
      expect(rule.validate(15)).toBe(true);
      expect(rule.validate(0)).toBe(true);
    });

    test('should fail when not divisible', () => {
      const rule = IsDivisibleBy(5)();
      expect(rule.validate(7)).toBe(false);
      expect(rule.validate(12)).toBe(false);
    });

    test('should have correct message', () => {
      const rule = IsDivisibleBy(3)();
      expect(rule.message).toBe('必须能被 3 整除');
    });
  });

  describe('IsBetween', () => {
    test('should pass for values in range', () => {
      const rule = IsBetween(1, 10)();
      expect(rule.validate(1)).toBe(true);
      expect(rule.validate(5)).toBe(true);
      expect(rule.validate(10)).toBe(true);
    });

    test('should fail for values out of range', () => {
      const rule = IsBetween(1, 10)();
      expect(rule.validate(0)).toBe(false);
      expect(rule.validate(11)).toBe(false);
    });

    test('should have correct message', () => {
      const rule = IsBetween(1, 100)();
      expect(rule.message).toBe('必须在 1 和 100 之间');
    });
  });

  describe('Contains', () => {
    test('should pass when string contains substring', () => {
      const rule = Contains('hello')();
      expect(rule.validate('hello world')).toBe(true);
      expect(rule.validate('say hello')).toBe(true);
    });

    test('should fail when string does not contain substring', () => {
      const rule = Contains('hello')();
      expect(rule.validate('hi world')).toBe(false);
    });

    test('should have correct message', () => {
      const rule = Contains('test')();
      expect(rule.message).toBe('必须包含 "test"');
    });
  });

  describe('NotContains', () => {
    test('should pass when string does not contain substring', () => {
      const rule = NotContains('bad')();
      expect(rule.validate('good word')).toBe(true);
    });

    test('should fail when string contains substring', () => {
      const rule = NotContains('bad')();
      expect(rule.validate('bad word')).toBe(false);
    });

    test('should have correct message', () => {
      const rule = NotContains('spam')();
      expect(rule.message).toBe('不能包含 "spam"');
    });
  });
});
