/**
 * RAG Pipeline Example — EmbeddingModule + VectorStoreModule + RagModule
 *
 * Demonstrates:
 * - Ingesting documents (text, file paths) into a knowledge base
 * - Embedding-based semantic search
 * - Building context-augmented LLM prompts
 * - Full Q&A over custom documents
 *
 * Run: bun run examples/05-ai/06-rag-pipeline.ts
 *
 * Note: Uses Ollama for both embeddings and LLM. Start Ollama first:
 *   ollama pull llama3.2
 *   ollama pull nomic-embed-text
 */
import {
  Application,
  Controller,
  Module,
  Injectable,
  Inject,
  POST,
  GET,
  Body,
  AiModule,
  AiService,
  OllamaProvider,
  EmbeddingModule,
  EmbeddingService,
  OllamaEmbeddingProvider,
  VectorStoreModule,
  MemoryVectorStore,
  RagModule,
  RagService,
  AI_SERVICE_TOKEN,
  EMBEDDING_SERVICE_TOKEN,
  RAG_SERVICE_TOKEN,
} from '@dangao/bun-server';

// ── Module Configuration ──────────────────────────────────────────────────────

AiModule.forRoot({
  providers: [{ name: 'ollama', provider: OllamaProvider, config: { defaultModel: 'llama3.2' }, default: true }],
  timeout: 60000,
});

EmbeddingModule.forRoot({
  provider: {
    name: 'ollama',
    provider: OllamaEmbeddingProvider,
    config: { model: 'nomic-embed-text', dimensions: 768 },
  },
});

VectorStoreModule.forRoot({ store: new MemoryVectorStore() });

RagModule.forRoot({ collection: 'knowledge-base', chunkSize: 512, topK: 3, minScore: 0.3 });

// ── Services ──────────────────────────────────────────────────────────────────

interface IngestRequest {
  text?: string;
  url?: string;
  collection?: string;
}

interface QueryRequest {
  question: string;
  collection?: string;
}

@Injectable()
class KnowledgeBaseService {
  public constructor(
    @Inject(AI_SERVICE_TOKEN) private readonly ai: AiService,
    @Inject(RAG_SERVICE_TOKEN) private readonly rag: RagService,
    @Inject(EMBEDDING_SERVICE_TOKEN) private readonly embedding: EmbeddingService,
  ) {}

  public async ingest(request: IngestRequest): Promise<{ chunks: number }> {
    let chunks: number;
    if (request.url) {
      chunks = await this.rag.ingest(
        { type: 'url', url: request.url },
        request.collection,
      );
    } else if (request.text) {
      chunks = await this.rag.ingest(
        { type: 'text', content: request.text, metadata: { source: 'manual' } },
        request.collection,
      );
    } else {
      return { chunks: 0 };
    }
    return { chunks };
  }

  public async query(request: QueryRequest): Promise<{ answer: string; sources: string[] }> {
    // Retrieve relevant context
    const context = await this.rag.retrieve(request.question, request.collection);

    // Build augmented prompt
    const systemPrompt = context.formatted
      ? `Answer based on the provided context only.\n\nContext:\n${context.formatted}`
      : 'Answer the question as best you can.';

    const response = await this.ai.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.question },
      ],
    });

    return {
      answer: response.content,
      sources: context.chunks.map((c) => c.content.slice(0, 80) + '...'),
    };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('/api/kb')
class KnowledgeBaseController {
  public constructor(private readonly service: KnowledgeBaseService) {}

  @POST('/ingest')
  public async ingest(@Body() body: IngestRequest) {
    return this.service.ingest(body);
  }

  @POST('/query')
  public async query(@Body() body: QueryRequest) {
    return this.service.query(body);
  }
}

@Module({
  imports: [AiModule, EmbeddingModule, VectorStoreModule, RagModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
})
class KnowledgeBaseModule {}

const app = new Application({ port: 3105, enableSignalHandlers: false });
app.registerModule(KnowledgeBaseModule);
await app.listen();

console.log('RAG Pipeline API running on http://localhost:3105');
console.log('');
console.log('Step 1 - Ingest some text:');
console.log('  curl -X POST http://localhost:3105/api/kb/ingest \\');
console.log('    -H "Content-Type: application/json" \\');
console.log("    -d '{\"text\": \"Bun is a fast JavaScript runtime. It uses JavaScriptCore engine instead of V8.\"}'");
console.log('');
console.log('Step 2 - Query the knowledge base:');
console.log('  curl -X POST http://localhost:3105/api/kb/query \\');
console.log('    -H "Content-Type: application/json" \\');
console.log("    -d '{\"question\": \"What engine does Bun use?\"}'");
