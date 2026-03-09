import { HttpException } from '../error/http-exception';

/**
 * Base AI provider error
 */
export class AiProviderError extends HttpException {
  public constructor(
    message: string,
    public readonly provider: string,
    statusCode = 502,
  ) {
    super(statusCode, `[${provider}] ${message}`);
  }
}

/**
 * LLM rate limit exceeded
 */
export class AiRateLimitError extends AiProviderError {
  public constructor(provider: string, retryAfterMs?: number) {
    super(
      retryAfterMs
        ? `Rate limit exceeded. Retry after ${retryAfterMs}ms`
        : 'Rate limit exceeded',
      provider,
      429,
    );
  }
}

/**
 * Input exceeds model context window
 */
export class AiContextLengthError extends AiProviderError {
  public constructor(provider: string, maxTokens?: number) {
    super(
      maxTokens
        ? `Context length exceeded (max ${maxTokens} tokens)`
        : 'Context length exceeded',
      provider,
      413,
    );
  }
}

/**
 * LLM request timed out
 */
export class AiTimeoutError extends AiProviderError {
  public constructor(provider: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`, provider, 504);
  }
}

/**
 * No AI providers configured
 */
export class AiNoProviderError extends HttpException {
  public constructor() {
    super(500, 'No AI providers configured. Call AiModule.forRoot() first.');
  }
}

/**
 * All providers in fallback chain failed
 */
export class AiAllProvidersFailed extends HttpException {
  public constructor(errors: string[]) {
    super(502, `All AI providers failed: ${errors.join('; ')}`);
  }
}
