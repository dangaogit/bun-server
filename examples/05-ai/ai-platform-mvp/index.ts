/**
 * AI Platform MVP — Dify-Comparable AI Middleware Demo
 *
 * A complete AI middle platform built with @dangao/bun-server v2.0.0
 * demonstrating all 9 AI official modules working together.
 *
 * Capabilities:
 *   ✅ Multi-model chat (OpenAI / Ollama) with streaming
 *   ✅ Conversation memory (multi-turn, auto-trim)
 *   ✅ Knowledge base management (RAG pipeline)
 *   ✅ Tool Calling ReAct Agent
 *   ✅ Prompt template management
 *   ✅ Content safety (PII, injection, moderation)
 *   ✅ MCP protocol server exposure
 *   ✅ LLMOps metrics (token usage, cost)
 *
 * Run: bun run examples/05-ai/ai-platform-mvp/index.ts
 * Port: 3500
 *
 * curl examples at bottom of file.
 */
import {
  Application,
  Module,
  AiModule,
  OllamaProvider,
  OpenAIProvider,
  ConversationModule,
  MemoryConversationStore,
  PromptModule,
  InMemoryPromptStore,
  EmbeddingModule,
  OllamaEmbeddingProvider,
  VectorStoreModule,
  MemoryVectorStore,
  RagModule,
  McpModule,
  AiGuardModule,
  createRequestLoggingMiddleware,
} from '@dangao/bun-server';
import { ChatModule } from './chat/chat.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { AgentModule } from './agent/agent.module';
import { PromptAdminModule } from './prompts/prompt-admin.module';
import { WorkflowModule } from './workflow/workflow.module';

// ── Module Configurations ─────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3500);
const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
const OLLAMA_CHAT_MODEL = process.env['OLLAMA_CHAT_MODEL'] ?? 'llama3.2';
const OLLAMA_EMBEDDING_MODEL = process.env['OLLAMA_EMBEDDING_MODEL'] ?? 'nomic-embed-text';

const OPENAI_COMPAT_API_KEY = process.env['OPENAI_COMPAT_API_KEY'] ?? process.env['OPENAI_API_KEY'] ?? '';
const OPENAI_COMPAT_BASE_URL = process.env['OPENAI_COMPAT_BASE_URL'] ?? process.env['OPENAI_BASE_URL'] ?? 'https://api.openai.com/v1';
const OPENAI_COMPAT_MODEL = process.env['OPENAI_COMPAT_MODEL'] ?? 'gpt-4o-mini';
const OPENAI_PREFERRED = (process.env['AI_PREFERRED_PROVIDER'] ?? 'openai') === 'openai';
const OPENAI_ENABLED = OPENAI_COMPAT_API_KEY.length > 0;

const openAiProviderConfig = {
  apiKey: OPENAI_COMPAT_API_KEY,
  baseUrl: OPENAI_COMPAT_BASE_URL,
  defaultModel: OPENAI_COMPAT_MODEL,
};

AiModule.forRoot({
  providers: [
    {
      name: 'ollama',
      provider: OllamaProvider,
      config: { defaultModel: OLLAMA_CHAT_MODEL },
      default: !OPENAI_PREFERRED || !OPENAI_ENABLED,
    },
    {
      name: 'openai',
      provider: OpenAIProvider,
      config: openAiProviderConfig,
      default: OPENAI_PREFERRED && OPENAI_ENABLED,
    },
  ],
  fallback: true,
  timeout: 60000,
  tools: { autoDiscover: true, maxIterations: 8 },
});

ConversationModule.forRoot({
  store: new MemoryConversationStore(),
  maxMessages: 50,
  autoTrim: true,
  summaryThreshold: 40,
});

PromptModule.forRoot({
  store: new InMemoryPromptStore(),
});

EmbeddingModule.forRoot({
  provider: {
    name: 'ollama',
    provider: OllamaEmbeddingProvider,
    config: { model: OLLAMA_EMBEDDING_MODEL, dimensions: 768 },
  },
  batchSize: 50,
});

VectorStoreModule.forRoot({ store: new MemoryVectorStore() });

RagModule.forRoot({
  collection: 'platform-kb',
  chunkSize: 512,
  chunkOverlap: 50,
  topK: 5,
  minScore: 0.3,
});

McpModule.forRoot({
  transport: 'sse',
  path: '/mcp',
  serverInfo: { name: 'ai-platform-mvp', version: '2.0.0', description: 'AI Platform MVP MCP Server' },
});

AiGuardModule.forRoot({
  piiDetection: { redact: true },
  promptInjection: { sensitivity: 'medium' },
  moderation: false, // Disable external moderation for local demo
});

// ── Root Application Module ───────────────────────────────────────────────────

@Module({
  imports: [
    AiModule,
    ConversationModule,
    PromptModule,
    EmbeddingModule,
    VectorStoreModule,
    RagModule,
    McpModule,
    AiGuardModule,
    ChatModule,
    KnowledgeModule,
    AgentModule,
    PromptAdminModule,
    WorkflowModule,
  ],
})
class AppModule {}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function logStartupInfo(): void {
  console.log('[startup] AI Platform MVP booting...');
  console.log(`[startup] port=${PORT}`);
  console.log(`[startup] ollamaBaseUrl=${OLLAMA_BASE_URL}`);
  console.log(`[startup] ollamaChatModel=${OLLAMA_CHAT_MODEL}`);
  console.log(`[startup] ollamaEmbeddingModel=${OLLAMA_EMBEDDING_MODEL}`);
  console.log(`[startup] openaiEnabled=${OPENAI_ENABLED}`);
  console.log(`[startup] openaiCompatBaseUrl=${OPENAI_COMPAT_BASE_URL}`);
  console.log(`[startup] openaiCompatModel=${OPENAI_COMPAT_MODEL}`);
  console.log(`[startup] preferredProvider=${OPENAI_PREFERRED ? 'openai' : 'ollama'}`);
}

async function checkOllamaHealth(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    if (response.ok) {
      console.log('[startup] ollama reachable');
      return;
    }
    console.warn(`[startup] ollama check failed with status=${response.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[startup] ollama unreachable: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

const app = new Application({ port: PORT, enableSignalHandlers: true });
app.use(createRequestLoggingMiddleware({ prefix: '[ai-platform-mvp]' }));
app.registerModule(AppModule);

process.on('unhandledRejection', (reason) => {
  console.error('[runtime] unhandledRejection', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[runtime] uncaughtException', error);
});

logStartupInfo();
await checkOllamaHealth();
await app.listen();
console.log('[startup] server is ready');

console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log(`║         AI Platform MVP — Port ${String(PORT).padEnd(18, ' ')}║`);
console.log('╠══════════════════════════════════════════════════╣');
console.log('║  POST /api/chat/              Chat (w/ memory)   ║');
console.log('║  GET  /api/chat/:id/history   Conversation log   ║');
console.log('║  POST /api/kb/ingest          Upload to KB       ║');
console.log('║  POST /api/kb/search          Semantic search    ║');
console.log('║  POST /api/agent/run          ReAct Agent        ║');
console.log('║  GET  /api/prompts/           List templates     ║');
console.log('║  POST /api/prompts/:id/render Render template    ║');
console.log('║  POST /api/workflows/         Create workflow    ║');
console.log('║  POST /api/workflows/:id/run  Execute workflow   ║');
console.log('║  GET  /mcp                    MCP SSE endpoint   ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log('Quick test:');
console.log(`  curl -X POST http://localhost:${PORT}/api/chat/ \\`);
console.log('    -H "Content-Type: application/json" \\');
console.log("    -d '{\"message\": \"Hello! What can you do?\"}'");
