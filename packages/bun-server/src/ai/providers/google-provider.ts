import type { LlmProvider, AiRequest, AiResponse, AiMessage } from '../types';
import { AiProviderError, AiRateLimitError } from '../errors';

export interface GoogleProviderConfig {
  apiKey: string;
  /** Default: gemini-2.0-flash */
  defaultModel?: string;
  /** Default: https://generativelanguage.googleapis.com/v1beta */
  baseUrl?: string;
}

export class GoogleProvider implements LlmProvider {
  public readonly name = 'google';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl: string;

  public constructor(config: GoogleProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? 'gemini-2.0-flash';
    this.baseUrl = (config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  }

  public async complete(request: AiRequest): Promise<AiResponse> {
    const model = request.model ?? this.defaultModel;
    const { contents, systemInstruction } = this.toGeminiMessages(request.messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      },
    };
    if (systemInstruction) body['system_instruction'] = { parts: [{ text: systemInstruction }] };

    if (request.tools && request.tools.length > 0) {
      body['tools'] = [{
        functionDeclarations: request.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }];
    }

    const res = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: request.signal,
      },
    );

    if (res.status === 429) throw new AiRateLimitError(this.name);
    if (!res.ok) throw new AiProviderError(await res.text(), this.name, res.status);

    const data = await res.json() as Record<string, unknown>;
    const candidate = (data['candidates'] as Array<Record<string, unknown>>)?.[0];
    const parts = (candidate?.['content'] as Record<string, unknown>)?.['parts'] as Array<Record<string, unknown>> ?? [];

    let content = '';
    const toolCalls: AiResponse['toolCalls'] = [];
    for (const part of parts) {
      if (part['text']) content += part['text'] as string;
      else if (part['functionCall']) {
        const fc = part['functionCall'] as Record<string, unknown>;
        toolCalls.push({
          id: `fc-${Date.now()}`,
          name: fc['name'] as string,
          arguments: fc['args'] as Record<string, unknown>,
        });
      }
    }

    const usageMeta = data['usageMetadata'] as Record<string, number> ?? {};
    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      model,
      provider: this.name,
      usage: {
        promptTokens: usageMeta['promptTokenCount'] ?? 0,
        completionTokens: usageMeta['candidatesTokenCount'] ?? 0,
        totalTokens: usageMeta['totalTokenCount'] ?? 0,
      },
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
    };
  }

  public stream(request: AiRequest): ReadableStream<Uint8Array> {
    const model = request.model ?? this.defaultModel;
    const { contents, systemInstruction } = this.toGeminiMessages(request.messages);
    const apiKey = this.apiKey;
    const baseUrl = this.baseUrl;
    const encoder = new TextEncoder();
    const signal = request.signal;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { temperature: request.temperature, maxOutputTokens: request.maxTokens },
    };
    if (systemInstruction) body['system_instruction'] = { parts: [{ text: systemInstruction }] };

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const res = await fetch(
            `${baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              signal,
            },
          );

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
                  const parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;
                  const candidate = (parsed['candidates'] as Array<Record<string, unknown>>)?.[0];
                  const parts = (candidate?.['content'] as Record<string, unknown>)?.['parts'] as Array<Record<string, unknown>> ?? [];
                  const text = parts.map((p) => p['text'] ?? '').join('');
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text, done: false })}\n\n`));
                } catch (_error) {
                  // skip
                }
              }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
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

  private toGeminiMessages(messages: AiMessage[]): {
    contents: unknown[];
    systemInstruction?: string;
  } {
    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const contents = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    return {
      contents,
      systemInstruction: systemParts.length > 0 ? systemParts.join('\n') : undefined,
    };
  }
}
