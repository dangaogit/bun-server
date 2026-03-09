import { Injectable, Inject } from '@dangao/bun-server';
import { AiService, AI_SERVICE_TOKEN } from '@dangao/bun-server';
import { ConversationService, CONVERSATION_SERVICE_TOKEN } from '@dangao/bun-server';
import { AiGuardService, AI_GUARD_SERVICE_TOKEN } from '@dangao/bun-server';
import { RagService, RAG_SERVICE_TOKEN } from '@dangao/bun-server';
import { OpenAIProvider, type OpenAIProviderConfig } from '@dangao/bun-server';

export interface ChatRequest {
  message: string;
  conversationId?: string;
  useRag?: boolean;
  stream?: boolean;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiOrganization?: string;
  openaiProject?: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  usage: unknown;
  provider: string;
  historyLength: number;
}

@Injectable()
export class ChatService {
  public constructor(
    @Inject(AI_SERVICE_TOKEN) private readonly ai: AiService,
    @Inject(CONVERSATION_SERVICE_TOKEN) private readonly conversations: ConversationService,
    @Inject(AI_GUARD_SERVICE_TOKEN) private readonly guard: AiGuardService,
    @Inject(RAG_SERVICE_TOKEN) private readonly rag: RagService,
  ) {}

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    // 1. Safety check
    const sanitizedMessage = await this.guard.checkOrThrow(request.message);

    // 2. Get or create conversation
    let convId = request.conversationId;
    if (!convId) {
      const conv = await this.conversations.create({ createdBy: 'user' });
      convId = conv.id;
    }

    // 3. Load history
    const history = await this.conversations.getHistory(convId);

    // 4. Optionally enrich with RAG context
    let systemPrompt = request.systemPrompt ?? 'You are a helpful AI assistant. Be concise and accurate.';
    if (request.useRag) {
      const ragContext = await this.rag.retrieve(sanitizedMessage);
      if (ragContext.formatted) {
        systemPrompt += `\n\nRelevant context:\n${ragContext.formatted}`;
      }
    }

    // 5. Call LLM
    const completeRequest = {
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: sanitizedMessage },
      ],
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    };

    const overrideProvider = this.createOpenAiOverrideProvider(request);
    const response = overrideProvider
      ? await overrideProvider.complete(completeRequest)
      : await this.ai.complete(completeRequest);

    // 6. Persist messages
    await this.conversations.appendMessage(convId, { role: 'user', content: sanitizedMessage });
    await this.conversations.appendMessage(convId, { role: 'assistant', content: response.content });

    return {
      conversationId: convId,
      reply: response.content,
      usage: response.usage,
      provider: response.provider,
      historyLength: history.length + 2,
    };
  }

  public streamChat(request: ChatRequest): { stream: ReadableStream<Uint8Array>; conversationId: string } {
    const convId = request.conversationId ?? crypto.randomUUID();
    const streamRequest = {
      messages: [
        { role: 'system', content: request.systemPrompt ?? 'You are a helpful AI assistant.' },
        { role: 'user', content: request.message },
      ],
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    };
    const overrideProvider = this.createOpenAiOverrideProvider(request);
    const stream = overrideProvider ? overrideProvider.stream(streamRequest) : this.ai.stream(streamRequest);
    return { stream, conversationId: convId };
  }

  public async getHistory(conversationId: string) {
    const history = await this.conversations.getHistory(conversationId);
    return { conversationId, messages: history, count: history.length };
  }

  public async deleteConversation(conversationId: string): Promise<boolean> {
    return this.conversations.delete(conversationId);
  }

  private createOpenAiOverrideProvider(request: ChatRequest): OpenAIProvider | null {
    const hasOpenAiOverride = Boolean(
      request.openaiApiKey || request.openaiBaseUrl || request.openaiOrganization || request.openaiProject,
    );
    const isOpenAiRequest = (request.provider ?? 'openai') === 'openai';
    if (!hasOpenAiOverride || !isOpenAiRequest) {
      return null;
    }

    const apiKey = request.openaiApiKey
      ?? process.env['OPENAI_COMPAT_API_KEY']
      ?? process.env['OPENAI_API_KEY']
      ?? '';
    if (!apiKey) {
      throw new Error('openaiApiKey is required when using OpenAI override config');
    }

    const providerConfig: OpenAIProviderConfig = {
      apiKey,
      baseUrl: request.openaiBaseUrl
        ?? process.env['OPENAI_COMPAT_BASE_URL']
        ?? process.env['OPENAI_BASE_URL'],
      defaultModel: request.model
        ?? process.env['OPENAI_COMPAT_MODEL']
        ?? 'gpt-4o-mini',
    };

    return new OpenAIProvider(providerConfig);
  }
}
