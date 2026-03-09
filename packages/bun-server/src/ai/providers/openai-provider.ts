import type { LlmProvider, AiRequest, AiResponse, AiMessage } from '../types';
import { AiProviderError, AiRateLimitError, AiContextLengthError, AiTimeoutError } from '../errors';

export interface OpenAIProviderConfig {
  apiKey: string;
  /** Default: https://api.openai.com/v1 */
  baseUrl?: string;
  /** Default: gpt-4o */
  defaultModel?: string;
  /** Pricing per 1M tokens (input/output) for cost estimation */
  pricing?: Record<string, { input: number; output: number }>;
}

const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
};

interface OpenAiToolCallFunction {
  name?: string;
  arguments?: string;
}

interface OpenAiToolCall {
  id?: string;
  function?: OpenAiToolCallFunction;
}

interface OpenAiMessage {
  content?: string | null;
  tool_calls?: OpenAiToolCall[];
}

interface OpenAiChoice {
  message?: OpenAiMessage;
  finish_reason?: string | null;
}

interface OpenAiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OpenAiChatCompletionResponse {
  choices?: OpenAiChoice[];
  usage?: OpenAiUsage;
}

export class OpenAIProvider implements LlmProvider {
  public readonly name = 'openai';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly pricing: Record<string, { input: number; output: number }>;

  public constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.defaultModel = config.defaultModel ?? 'gpt-4o';
    this.pricing = { ...DEFAULT_PRICING, ...(config.pricing ?? {}) };
  }

  public async complete(request: AiRequest): Promise<AiResponse> {
    const model = request.model ?? this.defaultModel;
    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    };

    if (request.tools && request.tools.length > 0) {
      body['tools'] = request.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const response = await this.post('/chat/completions', body);
    const choice = response.choices?.[0];
    const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const message = choice?.message;

    return {
      content: message?.content ?? '',
      toolCalls: message?.tool_calls?.map((tc) => ({
        id: tc.id ?? '',
        name: tc.function?.name ?? '',
        arguments: this.safeParseToolArguments(tc.function?.arguments),
      })),
      model,
      provider: this.name,
      usage: {
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
        estimatedCostUsd: this.estimateCost(
          model,
          usage.prompt_tokens ?? 0,
          usage.completion_tokens ?? 0,
        ),
      },
      finishReason: choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
    };
  }

  public stream(request: AiRequest): ReadableStream<Uint8Array> {
    const model = request.model ?? this.defaultModel;
    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true,
    };

    if (request.tools && request.tools.length > 0) {
      body['tools'] = request.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const encoder = new TextEncoder();
    const apiKey = this.apiKey;
    const baseUrl = this.baseUrl;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
          });

          if (!res.ok || !res.body) {
            const err = await res.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err, done: true })}\n\n`));
            controller.close();
            return;
          }

          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });

            const lines = buf.split('\n');
            buf = lines.pop() ?? '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;
                  const chunk = { content: delta?.content ?? '', done: false };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                } catch {
                  // skip malformed lines
                }
              }
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err), done: true })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });
  }

  public countTokens(messages: AiMessage[]): number {
    // Rough approximation: 1 token ≈ 4 chars
    return Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
  }

  private async post(path: string, body: Record<string, unknown>): Promise<OpenAiChatCompletionResponse> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      throw new AiRateLimitError(this.name, retryAfter ? Number(retryAfter) * 1000 : undefined);
    }
    if (res.status === 413) {
      throw new AiContextLengthError(this.name);
    }
    if (res.status === 408 || res.status === 504) {
      throw new AiTimeoutError(this.name, 30000);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new AiProviderError(text, this.name, res.status);
    }

    return await res.json() as OpenAiChatCompletionResponse;
  }

  private safeParseToolArguments(argumentsJson?: string): Record<string, unknown> {
    if (!argumentsJson) {
      return {};
    }
    try {
      const parsed = JSON.parse(argumentsJson);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = this.pricing[model];
    if (!pricing) return 0;
    return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
  }
}
