/**
 * Conversation Memory Example — ConversationModule
 *
 * Demonstrates:
 * - Creating and maintaining multi-turn conversations
 * - Loading history before each LLM call
 * - Auto-trimming when conversation grows too long
 * - Summarizer callback for context compression
 *
 * Run: bun run examples/05-ai/04-conversation-memory.ts
 */
import {
  Application,
  Controller,
  Module,
  Injectable,
  Inject,
  POST,
  GET,
  DELETE,
  Body,
  Param,
  AiModule,
  AiService,
  OllamaProvider,
  ConversationModule,
  ConversationService,
  MemoryConversationStore,
  AI_SERVICE_TOKEN,
  CONVERSATION_SERVICE_TOKEN,
} from '@dangao/bun-server';

AiModule.forRoot({
  providers: [{ name: 'ollama', provider: OllamaProvider, config: {}, default: true }],
  timeout: 60000,
});

ConversationModule.forRoot({
  store: new MemoryConversationStore(),
  maxMessages: 20,
  autoTrim: true,
  summaryThreshold: 16,
});

// ── Chat Service ──────────────────────────────────────────────────────────────

interface ChatRequest {
  message: string;
  conversationId?: string;
}

@Injectable()
class MemoryChatService {
  public constructor(
    @Inject(AI_SERVICE_TOKEN) private readonly ai: AiService,
    @Inject(CONVERSATION_SERVICE_TOKEN) private readonly conversations: ConversationService,
  ) {}

  public async chat(request: ChatRequest) {
    // Get or create conversation
    let convId = request.conversationId;
    if (!convId) {
      const conv = await this.conversations.create();
      convId = conv.id;
    }

    // Load history
    const history = await this.conversations.getHistory(convId);

    // Call LLM with full history
    const response = await this.ai.complete({
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Remember previous context.' },
        ...history,
        { role: 'user', content: request.message },
      ],
    });

    // Persist both user message and assistant reply
    await this.conversations.appendMessage(convId, { role: 'user', content: request.message });
    await this.conversations.appendMessage(convId, { role: 'assistant', content: response.content });

    return {
      conversationId: convId,
      reply: response.content,
      historyLength: history.length + 2,
    };
  }

  public async getHistory(id: string) {
    const history = await this.conversations.getHistory(id);
    return { conversationId: id, messages: history };
  }

  public async deleteConversation(id: string) {
    return this.conversations.delete(id);
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('/api/memory')
class MemoryController {
  public constructor(private readonly service: MemoryChatService) {}

  @POST('/chat')
  public async chat(@Body() body: ChatRequest) {
    return this.service.chat(body);
  }

  @GET('/conversations/:id')
  public async getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @DELETE('/conversations/:id')
  public async deleteConversation(@Param('id') id: string) {
    await this.service.deleteConversation(id);
    return { deleted: true };
  }
}

@Module({
  imports: [AiModule, ConversationModule],
  controllers: [MemoryController],
  providers: [MemoryChatService],
})
class MemoryModule {}

const port = Number(process.env.PORT ?? 3103);
const app = new Application({ port, enableSignalHandlers: false });
app.registerModule(MemoryModule);
await app.listen();

console.log(`Conversation Memory API running on http://localhost:${port}`);
console.log('');
console.log('Step 1 - Start a conversation:');
console.log(`  curl -X POST http://localhost:${port}/api/memory/chat \\`);
console.log('    -H "Content-Type: application/json" \\');
console.log('    -d \'{"message": "My name is Alice"}\'');
console.log('');
console.log('Step 2 - Continue the conversation (use the returned conversationId):');
console.log(`  curl -X POST http://localhost:${port}/api/memory/chat \\`);
console.log('    -H "Content-Type: application/json" \\');
console.log('    -d \'{"message": "What is my name?", "conversationId": "<ID>"}\'');
