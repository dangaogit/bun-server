import { Injectable } from '../di/decorators';
import { Inject } from '../di/decorators';
import type { ConversationStore, ConversationModuleOptions, Conversation } from './types';
import { CONVERSATION_OPTIONS_TOKEN } from './types';
import type { AiMessage } from '../ai/types';

/**
 * Manages conversation sessions — create, retrieve, append messages,
 * auto-trim, and optional summarization.
 */
@Injectable()
export class ConversationService {
  private readonly store: ConversationStore;
  private readonly maxMessages: number;
  private readonly autoTrim: boolean;
  private readonly summaryThreshold: number | undefined;

  public constructor(
    @Inject(CONVERSATION_OPTIONS_TOKEN) options: ConversationModuleOptions,
  ) {
    this.store = options.store!;
    this.maxMessages = options.maxMessages ?? 100;
    this.autoTrim = options.autoTrim ?? true;
    this.summaryThreshold = options.summaryThreshold;
  }

  /**
   * Create a new conversation session
   */
  public async create(metadata?: Record<string, unknown>): Promise<Conversation> {
    return this.store.create(metadata);
  }

  /**
   * Get a conversation by ID
   */
  public async get(id: string): Promise<Conversation | null> {
    return this.store.get(id);
  }

  /**
   * Get conversation history (messages only)
   */
  public async getHistory(id: string): Promise<AiMessage[]> {
    const conv = await this.store.get(id);
    return conv?.messages ?? [];
  }

  /**
   * Append a message and apply auto-trim / summarization if configured
   */
  public async appendMessage(id: string, message: AiMessage, options?: ConversationModuleOptions): Promise<void> {
    await this.store.appendMessage(id, message);

    const opts = options ?? {};
    const summarizer = opts.summarizer;
    const summaryThreshold = this.summaryThreshold;

    if (summaryThreshold && summarizer) {
      const conv = await this.store.get(id);
      if (conv && conv.messages.length >= summaryThreshold) {
        await this.summarizeAndCompress(id, conv.messages, summarizer);
        return;
      }
    }

    if (this.autoTrim) {
      await this.store.trim(id, this.maxMessages);
    }
  }

  /**
   * Delete a conversation
   */
  public async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * List all conversation IDs
   */
  public async list(): Promise<string[]> {
    return this.store.list();
  }

  /**
   * Manually compress conversation by summarizing old messages
   */
  public async summarize(
    id: string,
    summarizer: (messages: AiMessage[]) => Promise<string>,
  ): Promise<void> {
    const conv = await this.store.get(id);
    if (!conv) return;
    await this.summarizeAndCompress(id, conv.messages, summarizer);
  }

  private async summarizeAndCompress(
    id: string,
    messages: AiMessage[],
    summarizer: (messages: AiMessage[]) => Promise<string>,
  ): Promise<void> {
    const keepCount = Math.floor(this.maxMessages / 4);
    const toSummarize = messages.slice(0, -keepCount);
    const toKeep = messages.slice(-keepCount);

    if (toSummarize.length === 0) return;

    try {
      const summary = await summarizer(toSummarize);
      const summaryMessage: AiMessage = {
        role: 'system',
        content: `[Conversation summary: ${summary}]`,
      };

      const conv = await this.store.get(id);
      if (!conv) return;

      // Replace the conversation with summary + recent messages
      const newMessages = [summaryMessage, ...toKeep];
      for (const _msg of conv.messages) {
        await this.store.trim(id, 0);
      }
      // Re-add compressed messages
      for (const msg of newMessages) {
        await this.store.appendMessage(id, msg);
      }
    } catch {
      // If summarization fails, fall back to simple trim
      await this.store.trim(id, this.maxMessages);
    }
  }
}
