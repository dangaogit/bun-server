/**
 * PII detection result
 */
export interface PiiDetectionResult {
  detected: boolean;
  /** Sanitized text with PII redacted */
  sanitized: string;
  /** Types of PII found */
  types: string[];
}

/**
 * Content moderation result
 */
export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
}

/**
 * Prompt injection detection result
 */
export interface InjectionDetectionResult {
  detected: boolean;
  confidence: number;
  reason?: string;
}

/**
 * Combined guard result
 */
export interface AiGuardResult {
  allowed: boolean;
  pii?: PiiDetectionResult;
  moderation?: ModerationResult;
  injection?: InjectionDetectionResult;
  sanitizedInput?: string;
}

export interface AiGuardModuleOptions {
  /** Enable PII detection and redaction */
  piiDetection?: boolean | { redact?: boolean };
  /** Content moderation configuration */
  moderation?: boolean | {
    /** OpenAI API key for moderation (uses OpenAI Moderation API) */
    openaiApiKey?: string;
    /** Custom moderation function */
    moderator?: (text: string) => Promise<ModerationResult>;
    /** Categories to block */
    blockCategories?: string[];
  };
  /** Prompt injection detection */
  promptInjection?: boolean | {
    sensitivity?: 'low' | 'medium' | 'high';
  };
}

export const AI_GUARD_SERVICE_TOKEN = Symbol('@dangao/bun-server:ai-guard:service');
export const AI_GUARD_OPTIONS_TOKEN = Symbol('@dangao/bun-server:ai-guard:options');
export const AI_GUARD_METADATA_KEY = '@dangao/bun-server:ai-guard:options';
