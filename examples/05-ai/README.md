# AI Examples

**English** | [中文](./README_ZH.md)

This directory contains examples for all v2.0.0 AI official modules, plus a complete AI platform MVP demo.

## Module Examples

| File | Module | Core Demo | Port |
|------|--------|-----------|------|
| `01-basic-chat.ts` | AiModule | Multi-provider chat, Fallback chain | 3100 |
| `02-streaming-chat.ts` | AiModule | Streaming responses via SSE | 3101 |
| `03-tool-calling.ts` | AiModule + @AiTool() | Tool Calling loop, calculator + unit converter | 3102 |
| `04-conversation-memory.ts` | ConversationModule | Multi-turn chat with persistent history | 3103 |
| `05-prompt-templates.ts` | PromptModule | Template CRUD, `{{variable}}` interpolation, versioning | 3104 |
| `06-rag-pipeline.ts` | Embedding + VectorStore + RagModule | Document ingestion → semantic Q&A | 3105 |
| `07-mcp-server.ts` | McpModule | MCP protocol server, SSE transport, tool + resource registration | 3106 |
| `08-ai-guard.ts` | AiGuardModule | PII redaction, prompt injection detection, content moderation | 3107 |

## AI Platform MVP Demo

[`ai-platform-mvp/`](./ai-platform-mvp/) — A complete AI middleware platform demonstrating all AI modules working together:

- Multi-model chat with streaming + conversation memory
- Knowledge base management (upload → RAG → semantic search)
- Tool Calling ReAct Agent (calculator, web search, KB query)
- Prompt template management
- Content safety (AiGuard on all inputs)
- MCP server exposure
- LLMOps metrics (token usage, estimated cost)

**Port**: 3500

## Prerequisites

Most examples use Ollama for local, free inference. Install and start Ollama first:

```bash
# Install Ollama (macOS)
brew install ollama
ollama serve

# Pull required models
ollama pull llama3.2          # Chat model
ollama pull nomic-embed-text  # Embedding model (for RAG example)
```

For OpenAI-based examples:

```bash
export OPENAI_API_KEY=sk-...
```

## Run Any Example

```bash
bun run examples/05-ai/01-basic-chat.ts
```

Or use the package.json script shortcuts:

```bash
cd examples
bun run start:ai-basic-chat
bun run start:ai-streaming
bun run start:ai-tools
bun run start:ai-memory
bun run start:ai-prompts
bun run start:ai-rag
bun run start:ai-mcp
bun run start:ai-guard
bun run start:ai-platform-mvp
```

## Architecture

All AI modules follow the same abstract-first design pattern used throughout the framework:

```
AiModule (LLM + Tool Calling)
    ├── ConversationModule (multi-turn memory)
    ├── PromptModule (template management)
    ├── RagModule
    │   ├── EmbeddingModule
    │   └── VectorStoreModule
    ├── McpModule (MCP protocol server)
    └── AiGuardModule (content safety)
```

All providers communicate via Bun's native `fetch()` — no third-party AI SDK dependencies.

## Back

[← Back to Examples Index](../README.md)
