import type { InjectionDetectionResult } from '../types';

/** Common prompt injection patterns */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; reason: string; weight: number }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions?/i, reason: 'ignore_instructions', weight: 0.9 },
  { pattern: /forget\s+(all\s+)?previous\s+instructions?/i, reason: 'forget_instructions', weight: 0.9 },
  { pattern: /you\s+are\s+now\s+(?:a\s+)?(?:different|new|another)/i, reason: 'role_override', weight: 0.7 },
  { pattern: /disregard\s+(?:your\s+)?(?:previous\s+)?(?:instructions?|guidelines?|rules?)/i, reason: 'disregard_rules', weight: 0.8 },
  { pattern: /system\s*:\s*(?:you|your|ignore)/i, reason: 'fake_system_message', weight: 0.8 },
  { pattern: /\[system\]/i, reason: 'system_tag_injection', weight: 0.6 },
  { pattern: /act\s+as\s+(?:an?\s+)?(?:unrestricted|unfiltered|jailbreak)/i, reason: 'jailbreak_attempt', weight: 0.95 },
  { pattern: /jailbreak|DAN\s+mode|developer\s+mode/i, reason: 'jailbreak_keyword', weight: 0.85 },
  { pattern: /print\s+your\s+(?:system\s+)?prompt|reveal\s+your\s+instructions?/i, reason: 'prompt_extraction', weight: 0.7 },
];

/**
 * Detects prompt injection attacks using heuristic pattern matching.
 */
export class PromptInjectionDetector {
  private readonly threshold: number;

  public constructor(sensitivity: 'low' | 'medium' | 'high' = 'medium') {
    this.threshold = sensitivity === 'low' ? 0.85 : sensitivity === 'medium' ? 0.7 : 0.55;
  }

  /**
   * Analyze text for prompt injection patterns
   */
  public detect(text: string): InjectionDetectionResult {
    let maxScore = 0;
    let detectedReason: string | undefined;

    for (const { pattern, reason, weight } of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        if (weight > maxScore) {
          maxScore = weight;
          detectedReason = reason;
        }
      }
    }

    return {
      detected: maxScore >= this.threshold,
      confidence: maxScore,
      reason: detectedReason,
    };
  }
}
