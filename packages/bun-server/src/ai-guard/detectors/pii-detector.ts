import type { PiiDetectionResult } from '../types';

const PII_PATTERNS: Array<{ type: string; regex: RegExp; replacement: string }> = [
  {
    type: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL]',
  },
  {
    type: 'phone',
    regex: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE]',
  },
  {
    type: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN]',
  },
  {
    type: 'credit_card',
    regex: /\b(?:\d[ -]?){13,16}\b/g,
    replacement: '[CREDIT_CARD]',
  },
  {
    type: 'ip_address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_ADDRESS]',
  },
  {
    type: 'url_with_credentials',
    regex: /https?:\/\/[^:@\s]+:[^:@\s]+@[^\s]+/g,
    replacement: '[URL_WITH_CREDENTIALS]',
  },
];

/**
 * Detects and optionally redacts PII from text using regex patterns.
 */
export class PiiDetector {
  /**
   * Analyze text for PII
   */
  public detect(text: string, redact = true): PiiDetectionResult {
    const foundTypes = new Set<string>();
    let sanitized = text;

    for (const pattern of PII_PATTERNS) {
      if (pattern.regex.test(text)) {
        foundTypes.add(pattern.type);
        if (redact) {
          sanitized = sanitized.replace(pattern.regex, pattern.replacement);
        }
      }
      // Reset regex lastIndex
      pattern.regex.lastIndex = 0;
    }

    return {
      detected: foundTypes.size > 0,
      sanitized,
      types: Array.from(foundTypes),
    };
  }
}
