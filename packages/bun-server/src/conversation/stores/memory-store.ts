import type { ConversationStore, Conversation } from '../types';
import type { AiMessage } from '../../ai/types';

/**
 * In-memory conversation store — suitable for development and single-instance deployments.
 */
export class MemoryConversationStore implements ConversationStore {
  private readonly conversations = new Map<string, Conversation>();

  public async create(metadata: Record<string, unknown> = {}): Promise<Conversation> {
    const id = crypto.randomUUID();
    const conversation: Conversation = {
      id,
      messages: [],
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return { ...conversation, messages: [] };
  }

  public async get(id: string): Promise<Conversation | null> {
    const conv = this.conversations.get(id);
    if (!conv) return null;
    return { ...conv, messages: [...conv.messages] };
  }

  public async appendMessage(id: string, message: AiMessage): Promise<void> {
    const conv = this.conversations.get(id);
    if (!conv) throw new Error(`Conversation "${id}" not found`);
    conv.messages.push(message);
    conv.updatedAt = new Date();
  }

  public async trim(id: string, maxMessages: number): Promise<void> {
    const conv = this.conversations.get(id);
    if (!conv) return;
    if (conv.messages.length > maxMessages) {
      conv.messages = conv.messages.slice(-maxMessages);
      conv.updatedAt = new Date();
    }
  }

  public async delete(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  public async list(): Promise<string[]> {
    return Array.from(this.conversations.keys());
  }

  /** Number of stored conversations (for testing) */
  public get size(): number {
    return this.conversations.size;
  }
}
