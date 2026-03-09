/**
 * Basic Chat Example — AiModule
 *
 * Demonstrates:
 * - Configuring AiModule with multiple providers (OpenAI + Ollama fallback)
 * - Making chat completions
 * - Switching providers per-request
 * - Accessing usage/cost information
 *
 * Run: bun run examples/05-ai/01-basic-chat.ts
 *
 * Prerequisites:
 *   export OPENAI_API_KEY=sk-...
 *   (or set Ollama as default to run locally)
 */
import {
  Application,
  Controller,
  Module,
  Injectable,
  Inject,
  GET,
  POST,
  Body,
  Query,
  AiModule,
  AiService,
  OllamaProvider,
  OpenAIProvider,
  AI_SERVICE_TOKEN,
} from '@dangao/bun-server';

// ── Configuration ─────────────────────────────────────────────────────────────

AiModule.forRoot({
  providers: [
    {
      name: 'ollama',
      provider: OllamaProvider,
      config: { baseUrl: 'http://localhost:11434', defaultModel: 'llama3.2' },
      default: true,  // Use Ollama by default (free, local)
    },
    {
      name: 'openai',
      provider: OpenAIProvider,
      config: { apiKey: process.env['OPENAI_API_KEY'] ?? 'demo-key' },
    },
  ],
  fallback: true,   // If Ollama unavailable, fall back to OpenAI
  timeout: 30000,
});

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
class ChatService {
  public constructor(
    @Inject(AI_SERVICE_TOKEN) private readonly ai: AiService,
  ) {}

  public async chat(message: string, provider?: string): Promise<{ reply: string; usage: unknown; provider: string }> {
    const response = await this.ai.complete({
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Be concise.' },
        { role: 'user', content: message },
      ],
      provider,
    });

    return {
      reply: response.content,
      usage: response.usage,
      provider: response.provider,
    };
  }

  public getAvailableProviders(): string[] {
    return this.ai.getProviderNames();
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

interface ChatRequest {
  message: string;
  provider?: string;
}

@Controller('/api/chat')
class ChatController {
  public constructor(private readonly chatService: ChatService) {}

  @POST('/')
  public async chat(@Body() body: ChatRequest) {
    return this.chatService.chat(body.message, body.provider);
  }

  @GET('/providers')
  public getProviders() {
    return { providers: this.chatService.getAvailableProviders() };
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  imports: [AiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
class ChatModule {}

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Application({ port: 3100, enableSignalHandlers: false });
app.registerModule(ChatModule);
await app.listen();

console.log('Basic chat API running on http://localhost:3100');
console.log('');
console.log('Try:');
console.log('  curl -X POST http://localhost:3100/api/chat/ \\');
console.log('    -H "Content-Type: application/json" \\');
console.log('    -d \'{"message": "What is 2+2?"}\'');
console.log('');
console.log('  curl http://localhost:3100/api/chat/providers');
