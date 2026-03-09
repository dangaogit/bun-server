import { describe, expect, test } from 'bun:test';
import { PiiDetector } from '../../src/ai-guard/detectors/pii-detector';

describe('PiiDetector', () => {
  const detector = new PiiDetector();

  test('should detect email addresses', () => {
    const result = detector.detect('Contact me at alice@example.com for info.');
    expect(result.detected).toBe(true);
    expect(result.types).toContain('email');
    expect(result.sanitized).toContain('[EMAIL]');
    expect(result.sanitized).not.toContain('alice@example.com');
  });

  test('should detect phone numbers', () => {
    const result = detector.detect('Call me at 555-123-4567');
    expect(result.detected).toBe(true);
    expect(result.types).toContain('phone');
  });

  test('should detect SSNs', () => {
    const result = detector.detect('My SSN is 123-45-6789');
    expect(result.detected).toBe(true);
    expect(result.types).toContain('ssn');
    expect(result.sanitized).toContain('[SSN]');
  });

  test('should return original text if no PII found', () => {
    const text = 'This is a safe message with no personal information.';
    const result = detector.detect(text);
    expect(result.detected).toBe(false);
    expect(result.sanitized).toBe(text);
  });

  test('should not redact when redact=false', () => {
    const text = 'Email: test@test.com';
    const result = detector.detect(text, false);
    expect(result.detected).toBe(true);
    expect(result.sanitized).toBe(text);
  });
});
