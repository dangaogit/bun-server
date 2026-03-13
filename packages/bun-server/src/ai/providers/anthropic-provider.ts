import type { LlmProvider, AiRequest, AiResponse, AiMessage } from '../types';
import { AiProviderError, AiRateLimitError, AiContextLengthError } from '../errors';

export interface AnthropicProviderConfig {
  apiKey: string;
  /** Default: https://api.anthropic.com */
  baseUrl?: string;
  /** Default: claude-3-7-sonnet-20250219 */
  defaultModel?: string;
  /** API version header */
  anthropicVersion?: string;
}

export class AnthropicProvider implements LlmProvider {
  public readonly name = 'anthropic';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly anthropicVersion: string;

  public constructor(config: AnthropicProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
    this.defaultModel = config.defaultModel ?? 'claude-3-7-sonnet-20250219';
    this.anthropicVersion = config.anthropicVersion ?? '2023-06-01';
  }

  public async complete(request: AiRequest): Promise<AiResponse> {
    const model = request.model ?? this.defaultModel;

    // Separate system message from user/assistant messages
    const systemMessages = request.messages.filter((m) => m.role === 'system');
    const chatMessages = request.messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      messages: chatMessages.map((m) => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.role === 'tool'
          ? [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]
          : m.content,
      })),
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
    };

    if (systemMessages.length > 0) {
      body['system'] = systemMessages.map((m) => m.content).join('\n');
    }

    if (request.tools && request.tools.length > 0) {
      body['tools'] = request.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const response = await this.post('/v1/messages', body);
    const usage = (response['usage'] as { input_tokens: number; output_tokens: number }) ?? { input_tokens: 0, output_tokens: 0 };

    let content = '';
    const toolCalls: AiResponse['toolCalls'] = [];
    const contentBlocks = response['content'] as Array<Record<string, unknown>>;

    for (const block of contentBlocks) {
      if (block['type'] === 'text') content += block['text'] as string;
      else if (block['type'] === 'tool_use') {
        toolCalls.push({
          id: block['id'] as string,
          name: block['name'] as string,
          arguments: block['input'] as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      model,
      provider: this.name,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
      finishReason: response['stop_reason'] === 'tool_use' ? 'tool_calls' : 'stop',
    };
  }

  public stream(request: AiRequest): ReadableStream<Uint8Array> {
    const model = request.model ?? this.defaultModel;
    const systemMessages = request.messages.filter((m) => m.role === 'system');
    const chatMessages = request.messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
      stream: true,
    };
    if (systemMessages.length > 0) {
      body['system'] = systemMessages.map((m) => m.content).join('\n');
    }

    const apiKey = this.apiKey;
    const baseUrl = this.baseUrl;
    const anthropicVersion = this.anthropicVersion;
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const res = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': anthropicVersion,
            },
            body: JSON.stringify(body),
          });

          if (!res.ok || !res.body) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: await res.text(), done: true })}\n\n`));
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
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.type === 'content_block_delta') {
                    controller.enqueue(encoder.encode(
                      `data: ${JSON.stringify({ content: parsed.delta?.text ?? '', done: false })}\n\n`,
                    ));
                  } else if (parsed.type === 'message_stop') {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                  }
                } catch (_error) {
                  // skip
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
    return Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.anthropicVersion,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) throw new AiRateLimitError(this.name);
    if (res.status === 413) throw new AiContextLengthError(this.name);
    if (!res.ok) throw new AiProviderError(await res.text(), this.name, res.status);

    return res.json() as Promise<Record<string, unknown>>;
  }
}
