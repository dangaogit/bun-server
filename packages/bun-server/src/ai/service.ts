import { Injectable } from '../di/decorators';
import type {
  LlmProvider,
  AiRequest,
  AiResponse,
  AiModuleOptions,
  AiMessage,
} from './types';
import { AI_MODULE_OPTIONS_TOKEN } from './types';
import { Inject } from '../di/decorators';
import { AiNoProviderError, AiAllProvidersFailed, AiTimeoutError } from './errors';
import type { ToolRegistry } from './tools/tool-registry';
import { ToolExecutor } from './tools/tool-executor';

/**
 * Core AI service — manages multiple LLM providers, fallback, streaming,
 * Tool Calling loop, and cost tracking.
 */
@Injectable()
export class AiService {
  private readonly providers = new Map<string, LlmProvider>();
  private defaultProviderName: string | undefined;
  private readonly options: AiModuleOptions;
  private toolExecutor: ToolExecutor | null = null;

  public constructor(
    @Inject(AI_MODULE_OPTIONS_TOKEN) options: AiModuleOptions,
  ) {
    this.options = options;
    for (const entry of options.providers) {
      const provider = new entry.provider(entry.config);
      this.providers.set(entry.name, provider);
      if (entry.default || !this.defaultProviderName) {
        this.defaultProviderName = entry.name;
      }
    }
  }

  /**
   * Attach a ToolRegistry so the service can run Tool Calling loops
   */
  public setToolRegistry(registry: ToolRegistry): void {
    this.toolExecutor = new ToolExecutor(registry);
  }

  /**
   * Non-streaming completion with optional Tool Calling loop
   */
  public async complete(request: AiRequest): Promise<AiResponse> {
    const maxIterations = this.options.tools?.maxIterations ?? 10;
    let messages: AiMessage[] = [...request.messages];
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await this.completeSingle({ ...request, messages });

      // No tool calls — return final response
      if (!response.toolCalls || response.toolCalls.length === 0 || !this.toolExecutor) {
        return response;
      }

      // Append assistant message with tool calls
      messages = [
        ...messages,
        { role: 'assistant', content: response.content, toolCalls: response.toolCalls },
      ];

      // Execute tools and append results
      const toolResults = await this.toolExecutor.executeAll(response.toolCalls);
      messages = [...messages, ...toolResults];

      iteration++;
    }

    // Reached max iterations — do final pass without tools
    return this.completeSingle({ ...request, messages, tools: [] });
  }

  /**
   * Streaming completion — returns SSE ReadableStream
   */
  public stream(request: AiRequest): ReadableStream<Uint8Array> {
    const provider = this.getProvider(request.provider);
    return provider.stream(request);
  }

  /**
   * Estimate token count for messages using the default provider
   */
  public countTokens(messages: AiMessage[]): number {
    const provider = this.getProvider();
    return provider.countTokens(messages);
  }

  /**
   * Get a provider by name (or default)
   */
  public getProvider(name?: string): LlmProvider {
    const providerName = name ?? this.defaultProviderName;
    if (!providerName) throw new AiNoProviderError();

    const provider = this.providers.get(providerName);
    if (!provider) throw new AiNoProviderError();

    return provider;
  }

  /**
   * List all registered provider names
   */
  public getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  private async completeSingle(request: AiRequest): Promise<AiResponse> {
    const targetName = request.provider ?? this.defaultProviderName;
    if (!targetName) throw new AiNoProviderError();

    const fallback = this.options.fallback ?? false;
    const timeout = this.options.timeout ?? 30000;

    if (!fallback) {
      return this.withTimeout(this.getProvider(targetName).complete(request), timeout, targetName, request.signal);
    }

    // Fallback chain: try target first, then others in order
    const names = [
      targetName,
      ...Array.from(this.providers.keys()).filter((n) => n !== targetName),
    ];

    const errors: string[] = [];
    for (const name of names) {
      try {
        const provider = this.providers.get(name);
        if (!provider) continue;
        return await this.withTimeout(provider.complete({ ...request, provider: name }), timeout, name, request.signal);
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw new AiAllProvidersFailed(errors);
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, providerName: string, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason ?? new Error('Aborted'));
        return;
      }

      const timer = setTimeout(() => reject(new AiTimeoutError(providerName, ms)), ms);

      const onAbort = () => {
        clearTimeout(timer);
        reject(signal!.reason ?? new Error('Aborted'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      promise.then(
        (val) => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); resolve(val); },
        (err) => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); reject(err); },
      );
    });
  }
}
