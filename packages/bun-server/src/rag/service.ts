import { Injectable } from '../di/decorators';
import { Inject } from '../di/decorators';
import { getRuntime } from '../platform/runtime';
import type { EmbeddingService } from '../embedding/service';
import { EMBEDDING_SERVICE_TOKEN } from '../embedding/types';
import type { VectorStore } from '../vector-store/types';
import { VECTOR_STORE_TOKEN } from '../vector-store/types';
import type { IngestSource, RagContext, RagModuleOptions, DocumentChunker } from './types';
import { RAG_OPTIONS_TOKEN } from './types';
import { TextChunker } from './chunkers/text-chunker';
import { MarkdownChunker } from './chunkers/markdown-chunker';

/**
 * RAG service — document ingestion pipeline and context retrieval.
 *
 * Ingestion: source → load text → chunk → embed → store in VectorStore
 * Retrieval: query → embed → search VectorStore → format context
 */
@Injectable()
export class RagService {
  private readonly options: RagModuleOptions;
  private readonly embeddingService: EmbeddingService;
  private readonly vectorStore: VectorStore;
  private readonly textChunker: DocumentChunker;
  private readonly markdownChunker: DocumentChunker;

  public constructor(
    @Inject(RAG_OPTIONS_TOKEN) options: RagModuleOptions,
    @Inject(EMBEDDING_SERVICE_TOKEN) embeddingService: EmbeddingService,
    @Inject(VECTOR_STORE_TOKEN) vectorStore: VectorStore,
  ) {
    this.options = options;
    this.embeddingService = embeddingService;
    this.vectorStore = vectorStore;
    this.textChunker = new TextChunker(options.chunkSize, options.chunkOverlap);
    this.markdownChunker = new MarkdownChunker(options.chunkSize);
  }

  /**
   * Ingest a document source into the vector store
   * @param source - text, file path, or URL
   * @param collection - override default collection
   * @returns Number of chunks stored
   */
  public async ingest(source: IngestSource, collection?: string): Promise<number> {
    const targetCollection = collection ?? this.options.collection ?? 'rag';
    const text = await this.loadText(source);

    if (!text.trim()) return 0;

    // Choose chunker based on content type
    const isMarkdown = source.type === 'file' && (source.path.endsWith('.md') || source.path.endsWith('.mdx'));
    const chunker = isMarkdown ? this.markdownChunker : this.textChunker;
    const chunks = chunker.chunk(text);

    // Batch embed all chunks
    const vectors = await this.embeddingService.embedBatch(chunks.map((c) => c.content));

    // Store in vector store
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const vector = vectors[i]!;
      await this.vectorStore.upsert({
        id: crypto.randomUUID(),
        vector,
        content: chunk.content,
        collection: targetCollection,
        metadata: {
          ...(chunk.metadata ?? {}),
          ...(source.metadata ?? {}),
          sourceType: source.type,
          ...(source.type === 'file' ? { sourcePath: source.path } : {}),
          ...(source.type === 'url' ? { sourceUrl: source.url } : {}),
        },
      });
    }

    return chunks.length;
  }

  /**
   * Retrieve relevant context for a query
   * @param query - User query text
   * @param collection - override default collection
   */
  public async retrieve(query: string, collection?: string): Promise<RagContext> {
    const targetCollection = collection ?? this.options.collection ?? 'rag';
    const queryVector = await this.embeddingService.embed(query);

    const results = await this.vectorStore.search(queryVector, {
      topK: this.options.topK ?? 5,
      minScore: this.options.minScore ?? 0.5,
      collection: targetCollection,
    });

    const chunks = results.map((r) => ({
      content: r.document.content,
      score: r.score,
      metadata: r.document.metadata,
    }));

    const formatted = chunks.length > 0
      ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
      : '';

    return { chunks, formatted };
  }

  /**
   * Build a system prompt with retrieved context
   */
  public async buildContextPrompt(query: string, collection?: string): Promise<string> {
    const context = await this.retrieve(query, collection);
    if (!context.formatted) return '';
    return `Use the following context to answer the question:\n\n${context.formatted}`;
  }

  private async loadText(source: IngestSource): Promise<string> {
    switch (source.type) {
      case 'text':
        return source.content;

      case 'file': {
        const file = getRuntime().fs.file(source.path);
        return file.text();
      }

      case 'url': {
        const res = await fetch(source.url);
        if (!res.ok) throw new Error(`Failed to fetch ${source.url}: ${res.status}`);
        return res.text();
      }
    }
  }
}
