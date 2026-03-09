import type { ConversationStore, Conversation } from '../types';
import type { AiMessage } from '../../ai/types';

export interface DatabaseConversationStoreConfig {
  /** DatabaseService instance from DatabaseModule */
  database: DatabaseServiceLike;
  /** Table name for conversations (default: 'conversations') */
  tableName?: string;
}

/**
 * Minimal interface matching DatabaseService from DatabaseModule
 */
export interface DatabaseServiceLike {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

/**
 * Database-backed conversation store — suitable for durable storage with full history.
 *
 * Creates tables automatically on first use. Requires DatabaseModule to be configured.
 *
 * Schema:
 * ```sql
 * CREATE TABLE conversations (
 *   id TEXT PRIMARY KEY,
 *   messages TEXT NOT NULL,  -- JSON array
 *   metadata TEXT NOT NULL,  -- JSON object
 *   created_at TEXT NOT NULL,
 *   updated_at TEXT NOT NULL
 * );
 * ```
 */
export class DatabaseConversationStore implements ConversationStore {
  private readonly db: DatabaseServiceLike;
  private readonly tableName: string;
  private initialized = false;

  public constructor(config: DatabaseConversationStoreConfig) {
    this.db = config.database;
    this.tableName = config.tableName ?? 'conversations';
  }

  public async create(metadata: Record<string, unknown> = {}): Promise<Conversation> {
    await this.ensureTable();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.execute(
      `INSERT INTO ${this.tableName} (id, messages, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [id, '[]', JSON.stringify(metadata), now, now],
    );
    return { id, messages: [], metadata, createdAt: new Date(now), updatedAt: new Date(now) };
  }

  public async get(id: string): Promise<Conversation | null> {
    await this.ensureTable();
    const rows = await this.db.query<Record<string, string>>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id],
    );
    if (!rows.length) return null;
    return this.rowToConversation(rows[0]!);
  }

  public async appendMessage(id: string, message: AiMessage): Promise<void> {
    await this.ensureTable();
    const conv = await this.get(id);
    if (!conv) throw new Error(`Conversation "${id}" not found`);
    const messages = [...conv.messages, message];
    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE ${this.tableName} SET messages = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(messages), now, id],
    );
  }

  public async trim(id: string, maxMessages: number): Promise<void> {
    await this.ensureTable();
    const conv = await this.get(id);
    if (!conv || conv.messages.length <= maxMessages) return;
    const trimmed = conv.messages.slice(-maxMessages);
    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE ${this.tableName} SET messages = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(trimmed), now, id],
    );
  }

  public async delete(id: string): Promise<boolean> {
    await this.ensureTable();
    await this.db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return true;
  }

  public async list(): Promise<string[]> {
    await this.ensureTable();
    const rows = await this.db.query<{ id: string }>(`SELECT id FROM ${this.tableName}`);
    return rows.map((r) => r.id);
  }

  private async ensureTable(): Promise<void> {
    if (this.initialized) return;
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        messages TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    this.initialized = true;
  }

  private rowToConversation(row: Record<string, string>): Conversation {
    return {
      id: row['id']!,
      messages: JSON.parse(row['messages']!) as AiMessage[],
      metadata: JSON.parse(row['metadata']!) as Record<string, unknown>,
      createdAt: new Date(row['created_at']!),
      updatedAt: new Date(row['updated_at']!),
    };
  }
}
