import type { AiMessage } from '../ai/types';

/**
 * A conversation session
 */
export interface Conversation {
  id: string;
  messages: AiMessage[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Abstract conversation storage interface
 */
export interface ConversationStore {
  /**
   * Create a new conversation
   */
  create(metadata?: Record<string, unknown>): Promise<Conversation>;
  /**
   * Retrieve an existing conversation
   */
  get(id: string): Promise<Conversation | null>;
  /**
   * Append a message to a conversation
   */
  appendMessage(id: string, message: AiMessage): Promise<void>;
  /**
   * Trim messages to maxMessages (keeping the most recent)
   */
  trim(id: string, maxMessages: number): Promise<void>;
  /**
   * Delete a conversation
   */
  delete(id: string): Promise<boolean>;
  /**
   * List all conversation IDs
   */
  list(): Promise<string[]>;
}

/**
 * Summarizer callback — produce a summary string from conversation history
 */
export type ConversationSummarizer = (messages: AiMessage[]) => Promise<string>;

/**
 * ConversationModule configuration
 */
export interface ConversationModuleOptions {
  store?: ConversationStore;
  /** Maximum messages before auto-trim (default: 100) */
  maxMessages?: number;
  /** Enable auto-trim when maxMessages is reached (default: true) */
  autoTrim?: boolean;
  /**
   * When message count exceeds summaryThreshold, call summarizer and
   * replace old messages with a summary message.
   */
  summaryThreshold?: number;
  /** Summarizer callback — inject AiService here to avoid circular deps */
  summarizer?: ConversationSummarizer;
}

export const CONVERSATION_SERVICE_TOKEN = Symbol('@dangao/bun-server:conversation:service');
export const CONVERSATION_OPTIONS_TOKEN = Symbol('@dangao/bun-server:conversation:options');
