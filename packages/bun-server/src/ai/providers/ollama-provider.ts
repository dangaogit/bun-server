import type { LlmProvider, AiRequest, AiResponse, AiMessage } from '../types';
import { AiProviderError } from '../errors';

export interface OllamaProviderConfig {
  /** Default: http://localhost:11434 */
  baseUrl?: string;
  /** Default model to use */
  defaultModel?: string;
}

export class OllamaProvider implements LlmProvider {
  public readonly name = 'ollama';
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  public constructor(config: OllamaProviderConfig = {}) {
    this.baseUrl = (config.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
    this.defaultModel = config.defaultModel ?? 'llama3.2';
  }

  public async complete(request: AiRequest): Promise<AiResponse> {
    const model = request.model ?? this.defaultModel;

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens,
        },
      }),
      signal: request.signal,
    });

    if (!res.ok) {
      throw new AiProviderError(await res.text(), this.name, res.status);
    }

    const data = await res.json() as Record<string, unknown>;
    const message = data['message'] as Record<string, unknown>;
    const evalCount = (data['eval_count'] as number) ?? 0;
    const promptEvalCount = (data['prompt_eval_count'] as number) ?? 0;

    return {
      content: (message['content'] as string) ?? '',
      model,
      provider: this.name,
      usage: {
        promptTokens: promptEvalCount,
        completionTokens: evalCount,
        totalTokens: promptEvalCount + evalCount,
      },
      finishReason: 'stop',
    };
  }

  public stream(request: AiRequest): ReadableStream<Uint8Array> {
    const model = request.model ?? this.defaultModel;
    const baseUrl = this.baseUrl;
    const encoder = new TextEncoder();
    const signal = request.signal;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const res = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
              stream: true,
              options: {
                temperature: request.temperature,
                num_predict: request.maxTokens,
              },
            }),
            signal,
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
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line) as Record<string, unknown>;
                const msgContent = (parsed['message'] as Record<string, unknown>)?.['content'] as string ?? '';
                const isDone = Boolean(parsed['done']);
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ content: msgContent, done: isDone })}\n\n`,
                ));
              } catch (_error) {
                // skip
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
}
