# AI Modules

**English** | [中文](./zh/ai.md)

`@dangao/bun-server` v2.0.0 introduces **9 official AI modules** providing production-ready infrastructure for building LLM-powered applications.

All providers communicate via Bun's native `fetch()` — no third-party AI SDK dependencies are added to the framework package.

---

## Quick Start — 5-Minute Chat API

```bash
ollama pull llama3.2  # Free local model
```

```typescript
import {
  Application, Controller, Module, Injectable, Inject,
  POST, Body, AiModule, AiService, OllamaProvider, AI_SERVICE_TOKEN,
} from '@dangao/bun-server';

AiModule.forRoot({
  providers: [{ name: 'ollama', provider: OllamaProvider, config: {}, default: true }],
});

@Injectable()
class ChatService {
  constructor(@Inject(AI_SERVICE_TOKEN) private ai: AiService) {}
  async chat(msg: string) {
    return this.ai.complete({ messages: [{ role: 'user', content: msg }] });
  }
}

@Controller('/chat')
class ChatController {
  constructor(private svc: ChatService) {}
  @POST('/') async post(@Body() b: { message: string }) { return this.svc.chat(b.message); }
}

@Module({ imports: [AiModule], controllers: [ChatController], providers: [ChatService] })
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
app.listen();
```

---

## Module Overview

| Module | Token | Purpose |
|--------|-------|---------|
| `AiModule` | `AI_SERVICE_TOKEN` | LLM providers + Tool Calling + streaming |
| `ConversationModule` | `CONVERSATION_SERVICE_TOKEN` | Multi-turn conversation history |
| `PromptModule` | `PROMPT_SERVICE_TOKEN` | Prompt templates + versioning |
| `EmbeddingModule` | `EMBEDDING_SERVICE_TOKEN` | Text embedding generation |
| `VectorStoreModule` | `VECTOR_STORE_TOKEN` | Vector similarity search |
| `RagModule` | `RAG_SERVICE_TOKEN` | RAG ingest + retrieve pipeline |
| `McpModule` | `MCP_SERVER_TOKEN` | MCP protocol server |
| `AiGuardModule` | `AI_GUARD_SERVICE_TOKEN` | Content safety |

---

## AiModule — LLM Unified Access

### Configuration

```typescript
import { AiModule, OpenAIProvider, AnthropicProvider, OllamaProvider, GoogleProvider } from '@dangao/bun-server';

AiModule.forRoot({
  providers: [
    { name: 'openai', provider: OpenAIProvider, config: { apiKey: process.env.OPENAI_API_KEY! }, default: true },
    { name: 'claude', provider: AnthropicProvider, config: { apiKey: process.env.ANTHROPIC_API_KEY! } },
    { name: 'ollama', provider: OllamaProvider, config: { baseUrl: 'http://localhost:11434' } },
    { name: 'gemini', provider: GoogleProvider, config: { apiKey: process.env.GOOGLE_API_KEY! } },
  ],
  fallback: true,     // Try next provider on failure
  timeout: 30000,     // Request timeout in ms
  tools: {
    autoDiscover: true,  // Auto-register @AiTool() decorated methods
    maxIterations: 10,   // Max Tool Calling iterations
  },
});
```

### Usage

```typescript
@Injectable()
class ChatService {
  constructor(@Inject(AI_SERVICE_TOKEN) private ai: AiService) {}

  // Non-streaming
  async complete(messages: AiMessage[]) {
    return this.ai.complete({ messages, provider: 'openai' });
  }

  // Streaming (SSE)
  stream(messages: AiMessage[]): ReadableStream<Uint8Array> {
    return this.ai.stream({ messages });
  }

  // Switch provider
  async withClaude(messages: AiMessage[]) {
    return this.ai.complete({ messages, provider: 'claude' });
  }
}
```

### Streaming Responses

```typescript
@GET('/stream')
public streamChat(@Query('message') message: string): Response {
  const stream = this.aiService.stream({
    messages: [{ role: 'user', content: message }],
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

Each SSE chunk has the format: `data: {"content":"...","done":false}\n\n`

### Tool Calling with @AiTool()

```typescript
@Injectable()
class MyTools {
  @AiTool({
    name: 'get_weather',
    description: 'Get current weather for a city',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
  })
  async getWeather({ city }: { city: string }): Promise<string> {
    return `Weather in ${city}: 22°C, sunny`;
  }
}

// Register tools:
const registry = container.resolve<ToolRegistry>(AI_TOOL_REGISTRY_TOKEN);
registry.scanAndRegister(new MyTools());

// Complete with tools (auto-loop):
const response = await aiService.complete({
  messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
  tools: registry.getDefinitions(),
});
```

---

## ConversationModule — Multi-Turn Memory

### Configuration

```typescript
import { ConversationModule, MemoryConversationStore } from '@dangao/bun-server';

ConversationModule.forRoot({
  store: new MemoryConversationStore(),   // or RedisConversationStore / DatabaseConversationStore
  maxMessages: 50,
  autoTrim: true,
  summaryThreshold: 40,  // Trigger summarization when > 40 messages
  summarizer: async (messages) => {
    // Inject AiService to summarize — avoids circular dependency
    return await aiService.complete({ messages: [...messages, summaryPrompt] }).then(r => r.content);
  },
});
```

### Usage

```typescript
@POST('/chat')
async chat(@Body() body: { message: string; conversationId?: string }) {
  let convId = body.conversationId;
  if (!convId) {
    const conv = await this.conversations.create();
    convId = conv.id;
  }

  const history = await this.conversations.getHistory(convId);
  const response = await this.ai.complete({ messages: [...history, { role: 'user', content: body.message }] });

  await this.conversations.appendMessage(convId, { role: 'user', content: body.message });
  await this.conversations.appendMessage(convId, { role: 'assistant', content: response.content });

  return { conversationId: convId, reply: response.content };
}
```

### Stores

| Store | Use case |
|-------|----------|
| `MemoryConversationStore` | Development, single-instance (default) |
| `RedisConversationStore` | Production, multi-instance |
| `DatabaseConversationStore` | Durable storage, full history queries |

---

## PromptModule — Prompt Templates

### Configuration

```typescript
import { PromptModule, InMemoryPromptStore, FilePromptStore } from '@dangao/bun-server';

// In-memory (default):
PromptModule.forRoot({});

// File-based (loads from .prompts/*.json):
PromptModule.forRoot({
  store: new FilePromptStore({ promptsDir: './.prompts' }),
});
```

### Usage

```typescript
// Create template
await promptService.create({
  id: 'system-assistant',
  name: 'System: Assistant',
  content: 'You are {{role}}, a helpful assistant for {{company}}.',
});

// Render with variables
const prompt = await promptService.render('system-assistant', {
  role: 'data analyst',
  company: 'Acme Corp',
});
// "You are data analyst, a helpful assistant for Acme Corp."

// Update creates a new version
await promptService.update('system-assistant', { content: 'You are {{role}} at {{company}}.' });

// Retrieve specific version
const v1 = await promptService.getVersion('system-assistant', 1);
```

---

## EmbeddingModule + VectorStoreModule

### Configuration

```typescript
import {
  EmbeddingModule, OpenAIEmbeddingProvider,
  VectorStoreModule, MemoryVectorStore,
} from '@dangao/bun-server';

EmbeddingModule.forRoot({
  provider: { name: 'openai', provider: OpenAIEmbeddingProvider, config: { apiKey: '...' } },
  batchSize: 100,
});

VectorStoreModule.forRoot({
  store: new MemoryVectorStore(),  // or PineconeVectorStore / QdrantVectorStore
});
```

### Usage

```typescript
// Generate embeddings
const vector = await embeddingService.embed('Hello world');
const vectors = await embeddingService.embedBatch(['text 1', 'text 2']);

// Vector store operations
await vectorStore.upsert({ id: 'doc1', vector, content: 'Hello world', collection: 'docs' });
const results = await vectorStore.search(queryVector, { topK: 5, collection: 'docs', minScore: 0.7 });
```

---

## RagModule — RAG Pipeline

### Configuration

```typescript
import { RagModule } from '@dangao/bun-server';

// Requires EmbeddingModule and VectorStoreModule to be imported first
RagModule.forRoot({
  collection: 'my-kb',
  chunkSize: 512,
  chunkOverlap: 50,
  topK: 5,
  minScore: 0.5,
});
```

### Usage

```typescript
@Injectable()
class KnowledgeService {
  constructor(@Inject(RAG_SERVICE_TOKEN) private rag: RagService) {}

  // Ingest documents
  async ingest() {
    await this.rag.ingest({ type: 'text', content: 'Bun is a fast JS runtime.' });
    await this.rag.ingest({ type: 'file', path: './docs/manual.md' });
    await this.rag.ingest({ type: 'url', url: 'https://bun.sh/docs' });
  }

  // Retrieve context for a query
  async answer(question: string) {
    const context = await this.rag.retrieve(question);
    // context.formatted = "[1] Bun is...\n\n[2] ..."
    return context;
  }
}
```

---

## McpModule — Model Context Protocol Server

MCP (Model Context Protocol) enables AI clients (Cursor, Claude Desktop, VS Code Copilot) to call your API methods as tools.

### Configuration

```typescript
import { McpModule } from '@dangao/bun-server';

McpModule.forRoot({
  transport: 'sse',
  path: '/mcp',
  serverInfo: { name: 'my-api', version: '1.0.0' },
});
```

### Define MCP Tools

```typescript
@Injectable()
class MyTools {
  @McpTool({
    name: 'search_products',
    description: 'Search for products by keyword',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  })
  async searchProducts({ query }: { query: string }) {
    return this.productService.search(query);
  }
}

// Register in a controller:
@Controller('/mcp')
class McpController {
  constructor(
    @Inject(MCP_SERVER_TOKEN) private server: McpServer,
    private registry: McpRegistry,
    private tools: MyTools,
  ) {
    this.registry.scan(this.tools);
  }

  @GET('/') sse(): Response { return this.server.createSseResponse(); }
  @POST('/') async handle(): Promise<Response> { ... }
}
```

---

## AiGuardModule — Content Safety

### Configuration

```typescript
import { AiGuardModule } from '@dangao/bun-server';

AiGuardModule.forRoot({
  piiDetection: { redact: true },
  promptInjection: { sensitivity: 'medium' },  // 'low' | 'medium' | 'high'
  moderation: {
    openaiApiKey: process.env.OPENAI_API_KEY,  // Uses OpenAI Moderation API
    blockCategories: ['hate', 'violence', 'sexual'],
  },
});
```

### Usage

```typescript
// Manual check
const result = await guardService.check(userInput);
if (!result.allowed) throw new HttpException(400, 'Content not allowed');
const safeInput = result.sanitizedInput; // PII-redacted version

// Or throw automatically:
const safeInput = await guardService.checkOrThrow(userInput);

// Decorator (marks method-level checking):
@POST('/chat')
@AiGuard({ piiDetection: true, promptInjection: true })
async chat(@Body() body: { message: string }) { ... }
```

---

## Building AI Applications — Best Practices

### 1. Use Ollama for Local Development

```typescript
// Development: free, no API costs
AiModule.forRoot({
  providers: [
    { name: 'ollama', provider: OllamaProvider, config: {}, default: true },
    { name: 'openai', provider: OpenAIProvider, config: { apiKey: env.OPENAI_API_KEY! } },
  ],
  fallback: true,
});
```

### 2. Cache AI Responses

```typescript
// Combine with CacheModule to avoid redundant LLM calls
const cached = await cacheService.getOrSet(
  `ai:${hash(messages)}`,
  () => aiService.complete({ messages }),
  60_000, // 60s TTL
);
```

### 3. Track Token Usage and Costs

Every `AiResponse` includes `usage`:

```typescript
const response = await aiService.complete({ messages });
console.log(response.usage);
// { promptTokens: 120, completionTokens: 50, totalTokens: 170, estimatedCostUsd: 0.00043 }
```

### 4. Streaming Best Practices

```typescript
// Always set proper SSE headers
return new Response(aiService.stream({ messages }), {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

### 5. Always Guard User Input

```typescript
// Apply AiGuard before processing in production:
const safeMessage = await guardService.checkOrThrow(userInput);
```

---

## AI Capability Coverage

| Capability | Official Module |
|---|---|
| Multi-LLM providers | `AiModule` |
| Text embeddings | `EmbeddingModule` |
| Knowledge base / vector search | `VectorStoreModule` |
| RAG retrieval pipeline | `RagModule` |
| Conversation memory | `ConversationModule` |
| Prompt template management | `PromptModule` |
| Tool / Function Calling | `AiModule` (ToolRegistry + @AiTool()) |
| Content safety | `AiGuardModule` |
| MCP protocol server | `McpModule` |
| AI workflow orchestration | Demo layer (ai-platform-mvp example) |

---

## Related Resources

- [AI Modules Examples](../examples/05-ai/README.md)
- [AI Platform MVP Demo](../examples/05-ai/ai-platform-mvp/README.md)
- [Ollama Documentation](https://ollama.ai)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Anthropic API Reference](https://docs.anthropic.com)
- [MCP Specification](https://modelcontextprotocol.io)
