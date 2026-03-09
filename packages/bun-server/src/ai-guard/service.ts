import { Injectable } from '../di/decorators';
import { Inject } from '../di/decorators';
import type { AiGuardModuleOptions, AiGuardResult } from './types';
import { AI_GUARD_OPTIONS_TOKEN } from './types';
import { PiiDetector } from './detectors/pii-detector';
import { ContentModerator } from './detectors/content-moderator';
import { PromptInjectionDetector } from './detectors/injection-detector';
import { HttpException } from '../error/http-exception';

/**
 * AI Guard service — runs PII detection, content moderation, and prompt injection detection.
 */
@Injectable()
export class AiGuardService {
  private readonly piiDetector: PiiDetector | null;
  private readonly contentModerator: ContentModerator | null;
  private readonly injectionDetector: PromptInjectionDetector | null;
  private readonly options: AiGuardModuleOptions;

  public constructor(
    @Inject(AI_GUARD_OPTIONS_TOKEN) options: AiGuardModuleOptions,
  ) {
    this.options = options;

    this.piiDetector = options.piiDetection ? new PiiDetector() : null;

    if (options.moderation) {
      const modConfig = typeof options.moderation === 'object' ? options.moderation : {};
      this.contentModerator = new ContentModerator(modConfig);
    } else {
      this.contentModerator = null;
    }

    if (options.promptInjection) {
      const injConfig = typeof options.promptInjection === 'object' ? options.promptInjection : {};
      this.injectionDetector = new PromptInjectionDetector(injConfig.sensitivity);
    } else {
      this.injectionDetector = null;
    }
  }

  /**
   * Check and optionally sanitize input text.
   * Returns the guard result including sanitized input if PII redaction is enabled.
   */
  public async check(text: string): Promise<AiGuardResult> {
    let workingText = text;

    const result: AiGuardResult = { allowed: true };

    // 1. PII Detection
    if (this.piiDetector) {
      const redact = typeof this.options.piiDetection === 'object'
        ? this.options.piiDetection.redact !== false
        : true;
      const piiResult = this.piiDetector.detect(workingText, redact);
      result.pii = piiResult;
      if (redact && piiResult.detected) {
        workingText = piiResult.sanitized;
      }
    }

    // 2. Prompt Injection Detection
    if (this.injectionDetector) {
      const injResult = this.injectionDetector.detect(workingText);
      result.injection = injResult;
      if (injResult.detected) {
        result.allowed = false;
      }
    }

    // 3. Content Moderation
    if (this.contentModerator && result.allowed) {
      const modResult = await this.contentModerator.moderate(workingText);
      result.moderation = modResult;
      if (this.contentModerator.isBlocked(modResult)) {
        result.allowed = false;
      }
    }

    result.sanitizedInput = workingText;
    return result;
  }

  /**
   * Check and throw HttpException if the content is not allowed
   */
  public async checkOrThrow(text: string): Promise<string> {
    const result = await this.check(text);
    if (!result.allowed) {
      const reason = result.injection?.detected
        ? 'Prompt injection detected'
        : result.moderation?.flagged
          ? 'Content violates usage policies'
          : 'Content not allowed';
      throw new HttpException(400, reason);
    }
    return result.sanitizedInput ?? text;
  }
}
