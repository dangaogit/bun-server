import { describe, expect, test } from 'bun:test';

import {
  Validate,
  IsString,
  IsEmail,
  IsOptional,
  getValidationMetadata,
  validateParameters,
  ValidationError,
} from '../../src/validation';

class TestClass {
  public method(@Validate(IsString()) value: unknown): void {
    void value;
  }
}

describe('Validation Decorators', () => {
  test('should store validation metadata', () => {
    const metadata = getValidationMetadata(TestClass.prototype, 'method');
    expect(metadata.length).toBe(1);
    expect(metadata[0].index).toBe(0);
    expect(metadata[0].rules[0].name).toBe('isString');
  });

  test('validateParameters should throw ValidationError on failure', () => {
    const metadata = [
      { index: 0, rules: [IsEmail()] },
      { index: 1, rules: [IsOptional(), IsString()] },
    ];

    expect(() => validateParameters(['not-email', undefined], metadata)).toThrow(ValidationError);
  });

  test('validateParameters should allow optional values', () => {
    const metadata = [{ index: 0, rules: [IsOptional(), IsString()] }];
    expect(() => validateParameters([undefined], metadata)).not.toThrow();
  });
});


