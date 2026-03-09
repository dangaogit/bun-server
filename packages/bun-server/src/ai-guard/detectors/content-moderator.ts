import type { ModerationResult } from '../types';

export interface ContentModeratorConfig {
  /** OpenAI API key for the Moderation API */
  openaiApiKey?: string;
  /** Custom moderator function (overrides OpenAI if provided) */
  moderator?: (text: string) => Promise<ModerationResult>;
  /** Categories that will cause content to be flagged */
  blockCategories?: string[];
}

/**
 * Content moderation using OpenAI Moderation API or a custom function.
 */
export class ContentModerator {
  private readonly config: ContentModeratorConfig;

  public constructor(config: ContentModeratorConfig = {}) {
    this.config = config;
  }

  /**
   * Check text for harmful content
   */
  public async moderate(text: string): Promise<ModerationResult> {
    if (this.config.moderator) {
      return this.config.moderator(text);
    }

    if (this.config.openaiApiKey) {
      return this.moderateWithOpenAI(text);
    }

    // No moderation configured — allow all
    return { flagged: false, categories: {}, scores: {} };
  }

  /**
   * Check whether the result should block the request
   */
  public isBlocked(result: ModerationResult): boolean {
    if (!result.flagged) return false;
    const blockCategories = this.config.blockCategories;
    if (!blockCategories || blockCategories.length === 0) return true;
    return blockCategories.some((cat) => result.categories[cat]);
  }

  private async moderateWithOpenAI(text: string): Promise<ModerationResult> {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({ input: text }),
    });

    if (!res.ok) {
      // On API error, fail open (allow) to avoid disrupting service
      return { flagged: false, categories: {}, scores: {} };
    }

    const data = await res.json() as {
      results: Array<{
        flagged: boolean;
        categories: Record<string, boolean>;
        category_scores: Record<string, number>;
      }>;
    };

    const result = data.results[0];
    if (!result) return { flagged: false, categories: {}, scores: {} };

    return {
      flagged: result.flagged,
      categories: result.categories,
      scores: result.category_scores,
    };
  }
}
