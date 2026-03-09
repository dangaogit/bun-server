# Changelog - v2.0.0

## 🎉 New Features

### AI Official Modules (9 new modules)

- ✨ **AiModule** — LLM unified access layer with OpenAI, Anthropic Claude, Google Gemini, Ollama providers; streaming responses; Tool Calling (ToolRegistry + @AiTool() decorator); Fallback chain; zero external SDK dependencies
- ✨ **ConversationModule** — Multi-turn conversation memory with MemoryConversationStore, RedisConversationStore, DatabaseConversationStore; auto-trim and summarizer support; @InjectConversation() decorator
- ✨ **PromptModule** — Prompt template management with variable interpolation ({{var}}), versioning, InMemoryPromptStore and FilePromptStore
- ✨ **EmbeddingModule** — Text embedding generation with OpenAI and Ollama providers; batch support
- ✨ **VectorStoreModule** — Vector similarity search with built-in MemoryVectorStore (cosine similarity); Pinecone and Qdrant adapters
- ✨ **RagModule** — Full RAG pipeline: document ingestion (text/file/url), TextChunker/MarkdownChunker, @Rag() decorator for auto-context injection
- ✨ **McpModule** — MCP protocol server (JSON-RPC 2.0); @McpTool(), @McpResource(), @McpParam() decorators; SSE and stdio transport
- ✨ **AiGuardModule** — AI content safety: PiiDetector, ContentModerator (OpenAI Moderation API), PromptInjectionDetector; @AiGuard() decorator

### AI Platform MVP Demo

- ✨ `examples/05-ai/ai-platform-mvp/` — Complete AI middleware platform demo: multi-model chat with conversation memory, knowledge base management, Tool Calling ReAct agent, prompt template management, content moderation, MCP exposure, LLMOps metrics

### Web Portal

- ✨ `packages/web/` — Astro + Tailwind CSS promotional portal site with Landing page, documentation viewer, examples showcase, changelog

## 📝 Improvements

- ⚡ AI error types standardized: `AiProviderError`, `AiRateLimitError`, `AiContextLengthError`, `AiTimeoutError` (all extend `HttpException`)
- ⚡ Comprehensive `docs/ai.md` and `docs/zh/ai.md` covering all 9 AI modules
- ⚡ Updated `docs/migration.md` with complete v1.x → v2.0 guide
- ⚡ Updated architecture documentation in `.cursor/rules/architecture-overview.mdc`

## 📊 Tests

- ✅ All 9 AI modules have full test coverage (tests/ai/, tests/conversation/, tests/prompt/, tests/embedding/, tests/vector-store/, tests/rag/, tests/mcp/, tests/ai-guard/)
- ✅ All external API calls (OpenAI, etc.) use Mocks — no real network dependency in tests

---

**Full change list:**

- feat(ai): add AiModule with LlmProvider abstraction, 4 providers, streaming, Tool Calling
- feat(conversation): add ConversationModule with multi-store conversation history management
- feat(prompt): add PromptModule with template versioning and variable interpolation
- feat(embedding): add EmbeddingModule with OpenAI and Ollama providers
- feat(vector-store): add VectorStoreModule with MemoryVectorStore and external adapters
- feat(rag): add RagModule with full ingest-retrieve pipeline and chunkers
- feat(mcp): add McpModule with JSON-RPC 2.0 server and decorator-driven tool/resource registration
- feat(ai-guard): add AiGuardModule with PII, moderation and prompt injection detection
- feat(examples): add examples/05-ai/ with 8 module examples and ai-platform-mvp
- feat(web): add packages/web Astro portal site
- docs(ai): add comprehensive docs/ai.md and docs/zh/ai.md
- docs(migration): complete v1.x to v2.0 migration guide
