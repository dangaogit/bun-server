/**
 * AI message role
 */
export type AiMessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Single AI message
 */
export interface AiMessage {
  role: AiMessageRole;
  content: string;
  /** Tool call ID (only for role='tool') */
  toolCallId?: string;
  /** Tool calls returned by assistant */
  toolCalls?: AiToolCall[];
}

/**
 * AI tool call from LLM response
 */
export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * AI tool definition (for function calling)
 */
export interface AiToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for parameters */
  parameters: Record<string, unknown>;
}

/**
 * AI request to LLM
 */
export interface AiRequest {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: AiToolDefinition[];
  /** Provider name override */
  provider?: string;
}

/**
 * Non-streaming AI response
 */
export interface AiResponse {
  content: string;
  toolCalls?: AiToolCall[];
  model: string;
  provider: string;
  usage: AiUsage;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

/**
 * Streaming AI chunk
 */
export interface AiChunk {
  content?: string;
  toolCallDelta?: {
    index: number;
    id?: string;
    name?: string;
    argumentsDelta?: string;
  };
  done: boolean;
  model?: string;
  usage?: AiUsage;
}

/**
 * Token usage statistics
 */
export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Estimated cost in USD */
  estimatedCostUsd?: number;
}

/**
 * LLM provider abstraction interface
 */
export interface LlmProvider {
  /**
   * Non-streaming completion
   */
  complete(request: AiRequest): Promise<AiResponse>;
  /**
   * Streaming completion — returns SSE-encoded ReadableStream
   */
  stream(request: AiRequest): ReadableStream<Uint8Array>;
  /**
   * Approximate token count for messages
   */
  countTokens(messages: AiMessage[]): number;
  /** Provider name */
  readonly name: string;
}

/**
 * Provider configuration entry
 */
export interface AiProviderConfig<T = unknown> {
  name: string;
  provider: new (config: T) => LlmProvider;
  config: T;
  /** Use this provider by default */
  default?: boolean;
}

/**
 * AiModule configuration
 */
export interface AiModuleOptions {
  providers: AiProviderConfig[];
  /** Enable provider fallback chain on error */
  fallback?: boolean;
  /** Request timeout in ms */
  timeout?: number;
  /** Tool calling configuration */
  tools?: {
    /** Auto-discover @AiTool() decorated methods */
    autoDiscover?: boolean;
    /** Max tool call iterations per request */
    maxIterations?: number;
  };
}

export const AI_SERVICE_TOKEN = Symbol('@dangao/bun-server:ai:service');
export const AI_MODULE_OPTIONS_TOKEN = Symbol('@dangao/bun-server:ai:options');
export const AI_TOOL_REGISTRY_TOKEN = Symbol('@dangao/bun-server:ai:tool-registry');

/**
 * Metadata key for @AiTool decorator
 */
export const AI_TOOL_METADATA_KEY = '@dangao/bun-server:ai:tool';
