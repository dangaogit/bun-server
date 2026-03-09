import type { ConversationStore, Conversation } from '../types';
import type { AiMessage } from '../../ai/types';

export interface RedisConversationStoreConfig {
  /** Redis client that supports get/set/del/keys commands */
  client: RedisClient;
  /** Key prefix (default: 'conv:') */
  keyPrefix?: string;
  /** TTL in seconds for conversation keys (default: 86400 = 24h) */
  ttl?: number;
}

/**
 * Minimal Redis client interface — compatible with ioredis and node-redis
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
}

/**
 * Redis-backed conversation store — suitable for multi-instance production deployments.
 *
 * Requires an external Redis client to be injected. Compatible with ioredis / node-redis.
 */
export class RedisConversationStore implements ConversationStore {
  private readonly client: RedisClient;
  private readonly keyPrefix: string;
  private readonly ttl: number;

  public constructor(config: RedisConversationStoreConfig) {
    this.client = config.client;
    this.keyPrefix = config.keyPrefix ?? 'conv:';
    this.ttl = config.ttl ?? 86400;
  }

  public async create(metadata: Record<string, unknown> = {}): Promise<Conversation> {
    const id = crypto.randomUUID();
    const conversation: Conversation = {
      id,
      messages: [],
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.save(conversation);
    return conversation;
  }

  public async get(id: string): Promise<Conversation | null> {
    const raw = await this.client.get(this.key(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Conversation;
    parsed.createdAt = new Date(parsed.createdAt);
    parsed.updatedAt = new Date(parsed.updatedAt);
    return parsed;
  }

  public async appendMessage(id: string, message: AiMessage): Promise<void> {
    const conv = await this.get(id);
    if (!conv) throw new Error(`Conversation "${id}" not found`);
    conv.messages.push(message);
    conv.updatedAt = new Date();
    await this.save(conv);
  }

  public async trim(id: string, maxMessages: number): Promise<void> {
    const conv = await this.get(id);
    if (!conv) return;
    if (conv.messages.length > maxMessages) {
      conv.messages = conv.messages.slice(-maxMessages);
      conv.updatedAt = new Date();
      await this.save(conv);
    }
  }

  public async delete(id: string): Promise<boolean> {
    const result = await this.client.del(this.key(id));
    return Number(result) > 0;
  }

  public async list(): Promise<string[]> {
    const keys = await this.client.keys(`${this.keyPrefix}*`);
    return keys.map((k) => k.slice(this.keyPrefix.length));
  }

  private key(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  private async save(conversation: Conversation): Promise<void> {
    await this.client.set(
      this.key(conversation.id),
      JSON.stringify(conversation),
      'EX',
      this.ttl,
    );
  }
}
