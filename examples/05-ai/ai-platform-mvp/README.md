# AI Platform MVP

A complete AI middleware platform built with `@dangao/bun-server` v2.0.0.

## Architecture

```
ai-platform-mvp/
├── index.ts                    # App entry — module config + bootstrap
├── chat/
│   ├── chat.controller.ts      # POST /api/chat/, GET /:id/history
│   ├── chat.service.ts         # Multi-turn chat with RAG + guard
│   └── chat.module.ts
├── knowledge/
│   ├── knowledge.controller.ts # POST /api/kb/ingest, POST /api/kb/search
│   ├── knowledge.service.ts    # Document ingestion and retrieval
│   └── knowledge.module.ts
├── agent/
│   ├── agent.controller.ts     # POST /api/agent/run
│   ├── agent.service.ts        # ReAct-style agent loop
│   ├── agent.module.ts
│   └── tools/
│       ├── calculator.tool.ts  # @AiTool() math calculation
│       ├── web-search.tool.ts  # @AiTool() mock web search
│       └── kb-query.tool.ts    # @AiTool() knowledge base query
├── prompts/
│   ├── prompt-admin.controller.ts  # CRUD /api/prompts/
│   └── prompt-admin.module.ts
├── workflow/
│   ├── workflow.controller.ts      # CRUD + run /api/workflows/*
│   ├── workflow.service.ts         # Orchestrator runtime
│   ├── workflow.module.ts
│   └── types.ts
└── web/                            # React + Vite console + X6 orchestrator
```

## API Reference

### Chat API

```bash
# Start a conversation
curl -X POST http://localhost:3500/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Continue conversation
curl -X POST http://localhost:3500/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my greeting?", "conversationId": "<ID>"}'

# Chat with RAG context
curl -X POST http://localhost:3500/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "What do you know about Bun?", "useRag": true}'

# Streaming chat
curl -X POST http://localhost:3500/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me a short story."}'

# Get conversation history
curl http://localhost:3500/api/chat/<CONVERSATION_ID>/history
```

### Knowledge Base API

```bash
# Ingest text
curl -X POST http://localhost:3500/api/kb/ingest \
  -H "Content-Type: application/json" \
  -d '{"text": "Bun is a fast JavaScript runtime using JavaScriptCore engine."}'

# Ingest from URL
curl -X POST http://localhost:3500/api/kb/ingest \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/doc.txt"}'

# Semantic search
curl -X POST http://localhost:3500/api/kb/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What engine does Bun use?"}'
```

### Agent API

```bash
# Run ReAct agent with tools
curl -X POST http://localhost:3500/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"task": "Calculate 15 * 27 + 334 and search what Bun runtime is."}'
```

### Prompt Management API

```bash
# List templates
curl http://localhost:3500/api/prompts/

# Create template
curl -X POST http://localhost:3500/api/prompts/ \
  -H "Content-Type: application/json" \
  -d '{"name": "greeting", "content": "Hello {{name}}, welcome to {{app}}!"}'

# Render template
curl -X POST http://localhost:3500/api/prompts/greeting/render \
  -H "Content-Type: application/json" \
  -d '{"variables": {"name": "Alice", "app": "AI Platform"}}'
```

### Workflow Orchestration API

```bash
# Create workflow
curl -X POST http://localhost:3500/api/workflows/ \
  -H "Content-Type: application/json" \
  -d '{
    "name":"demo-workflow",
    "graph":{
      "nodes":[
        {"id":"n1","data":{"nodeType":"start"}},
        {"id":"n2","data":{"nodeType":"chat","config":{"message":"Hello {{input}}"}}},
        {"id":"n3","data":{"nodeType":"end"}}
      ],
      "edges":[
        {"source":{"cell":"n1"},"target":{"cell":"n2"}},
        {"source":{"cell":"n2"},"target":{"cell":"n3"}}
      ]
    }
  }'

# Run workflow
curl -X POST http://localhost:3500/api/workflows/<WORKFLOW_ID>/run \
  -H "Content-Type: application/json" \
  -d '{"input":"Bun Server"}'
```

### MCP Server

```bash
# List MCP tools
curl http://localhost:3500/mcp \
  -H "Accept: text/event-stream"
```

## Console UI (React + X6)

The MVP now includes a standalone frontend project under `web/`:

```bash
# Terminal 1: start backend
bun run examples/05-ai/ai-platform-mvp/index.ts

# Terminal 2: start frontend
cd examples/05-ai/ai-platform-mvp/web
bun install
bun run dev
```

Frontend dev server runs at `http://localhost:8080` and proxies `/api/*` to `http://localhost:3500`.

## Zeabur Deployment (API + Web)

The Dockerfile runs both services in one container:

- Web: `0.0.0.0:8080` (public entry)
- API: `3500` inside container (proxied by web server)

Use the Dockerfile in this directory:

```bash
docker build -f examples/05-ai/ai-platform-mvp/Dockerfile -t ai-platform-mvp .
docker run --rm -p 8080:8080 ai-platform-mvp
```

## AI Capability Coverage

| Capability | This Demo |
|---|---|
| Multi-LLM support | ✅ Ollama + OpenAI |
| Streaming responses | ✅ SSE |
| Conversation memory | ✅ ConversationModule |
| Knowledge base (RAG) | ✅ RagModule |
| Tool Calling | ✅ @AiTool() + ToolRegistry |
| Agent orchestration | ✅ AgentService (ReAct-style) |
| Prompt templates | ✅ PromptModule |
| Visual orchestration | ✅ X6 + Workflow API |
| Content safety | ✅ AiGuardModule (PII + injection) |
| MCP server | ✅ McpModule |
| Metrics/observability | ✅ usage in every response |
