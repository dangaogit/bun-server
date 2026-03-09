# AI 模块

[English](../ai.md) | **中文**

`@dangao/bun-server` v2.0.0 引入 **9 个官方 AI 模块**，为构建 LLM 驱动应用提供生产级基础设施。

所有 Provider 通过 Bun 原生 `fetch()` 调用 REST API，框架包不增加任何第三方 AI SDK 依赖。

---

## 快速开始 — 5 分钟聊天 API

```bash
ollama pull llama3.2  # 免费本地模型
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

## 模块概览

| 模块 | Token | 功能 |
|------|-------|------|
| `AiModule` | `AI_SERVICE_TOKEN` | LLM Provider + Tool Calling + 流式响应 |
| `ConversationModule` | `CONVERSATION_SERVICE_TOKEN` | 多轮会话历史管理 |
| `PromptModule` | `PROMPT_SERVICE_TOKEN` | Prompt 模板 + 版本管理 |
| `EmbeddingModule` | `EMBEDDING_SERVICE_TOKEN` | 文本向量嵌入 |
| `VectorStoreModule` | `VECTOR_STORE_TOKEN` | 向量相似度搜索 |
| `RagModule` | `RAG_SERVICE_TOKEN` | RAG 管道（摄取 → 检索） |
| `McpModule` | `MCP_SERVER_TOKEN` | MCP 协议服务端 |
| `AiGuardModule` | `AI_GUARD_SERVICE_TOKEN` | 内容安全防护 |

---

## AiModule — LLM 统一接入

### 配置

```typescript
import { AiModule, OpenAIProvider, AnthropicProvider, OllamaProvider, GoogleProvider } from '@dangao/bun-server';

AiModule.forRoot({
  providers: [
    { name: 'openai', provider: OpenAIProvider, config: { apiKey: process.env.OPENAI_API_KEY! }, default: true },
    { name: 'claude', provider: AnthropicProvider, config: { apiKey: process.env.ANTHROPIC_API_KEY! } },
    { name: 'ollama', provider: OllamaProvider, config: { baseUrl: 'http://localhost:11434' } },
    { name: 'gemini', provider: GoogleProvider, config: { apiKey: process.env.GOOGLE_API_KEY! } },
  ],
  fallback: true,     // 主 Provider 失败时自动切换
  timeout: 30000,     // 请求超时（毫秒）
  tools: {
    autoDiscover: true,  // 自动注册 @AiTool() 标注的方法
    maxIterations: 10,   // Tool Calling 最大循环次数
  },
});
```

### 使用

```typescript
@Injectable()
class ChatService {
  constructor(@Inject(AI_SERVICE_TOKEN) private ai: AiService) {}

  // 非流式对话
  async complete(messages: AiMessage[]) {
    return this.ai.complete({ messages });
  }

  // 流式响应（SSE）
  stream(messages: AiMessage[]): ReadableStream<Uint8Array> {
    return this.ai.stream({ messages });
  }

  // 指定 Provider
  async withClaude(messages: AiMessage[]) {
    return this.ai.complete({ messages, provider: 'claude' });
  }
}
```

### 流式响应集成

```typescript
@GET('/stream')
public streamChat(@Query('message') message: string): Response {
  const stream = this.aiService.stream({
    messages: [{ role: 'user', content: message }],
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

每个 SSE 块格式：`data: {"content":"...","done":false}\n\n`

### Tool Calling — @AiTool() 装饰器

```typescript
@Injectable()
class MyTools {
  @AiTool({
    name: 'get_weather',
    description: '获取城市当前天气',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
  })
  async getWeather({ city }: { city: string }): Promise<string> {
    return `${city} 天气：22°C，晴天`;
  }
}

// 注册工具：
const registry = container.resolve<ToolRegistry>(AI_TOOL_REGISTRY_TOKEN);
registry.scanAndRegister(new MyTools());

// 带工具的对话（自动循环）：
const response = await aiService.complete({
  messages: [{ role: 'user', content: '东京今天天气如何？' }],
  tools: registry.getDefinitions(),
});
```

---

## ConversationModule — 多轮会话记忆

### 配置

```typescript
import { ConversationModule, MemoryConversationStore } from '@dangao/bun-server';

ConversationModule.forRoot({
  store: new MemoryConversationStore(),   // 或 RedisConversationStore / DatabaseConversationStore
  maxMessages: 50,
  autoTrim: true,
  summaryThreshold: 40,  // 超过 40 条时触发摘要压缩
  summarizer: async (messages) => {
    // 注入 AiService 进行摘要——避免循环依赖
    return await aiService.complete({ messages: [...messages, summaryPrompt] }).then(r => r.content);
  },
});
```

### 使用

```typescript
@POST('/chat')
async chat(@Body() body: { message: string; conversationId?: string }) {
  let convId = body.conversationId;
  if (!convId) {
    const conv = await this.conversations.create();
    convId = conv.id;
  }

  const history = await this.conversations.getHistory(convId);
  const response = await this.ai.complete({
    messages: [...history, { role: 'user', content: body.message }],
  });

  await this.conversations.appendMessage(convId, { role: 'user', content: body.message });
  await this.conversations.appendMessage(convId, { role: 'assistant', content: response.content });

  return { conversationId: convId, reply: response.content };
}
```

### 存储方案

| 存储 | 适用场景 |
|------|---------|
| `MemoryConversationStore` | 开发环境、单实例（默认） |
| `RedisConversationStore` | 生产环境、多实例 |
| `DatabaseConversationStore` | 持久化存储、历史查询 |

---

## PromptModule — Prompt 模板管理

### 配置

```typescript
import { PromptModule, FilePromptStore } from '@dangao/bun-server';

PromptModule.forRoot({
  store: new FilePromptStore({ promptsDir: './.prompts' }),  // 从 .prompts/*.json 加载
});
```

### 使用

```typescript
// 创建模板
await promptService.create({
  id: 'system-assistant',
  name: '系统提示：助手',
  content: '你是 {{role}}，{{company}} 的专业助手。',
});

// 渲染模板
const prompt = await promptService.render('system-assistant', {
  role: '数据分析师',
  company: '某科技公司',
});
// "你是数据分析师，某科技公司的专业助手。"

// 更新自动创建新版本
await promptService.update('system-assistant', { content: '你是 {{role}}，在 {{company}} 工作。' });

// 获取特定版本
const v1 = await promptService.getVersion('system-assistant', 1);
```

---

## EmbeddingModule + VectorStoreModule

### 配置

```typescript
EmbeddingModule.forRoot({
  provider: { name: 'openai', provider: OpenAIEmbeddingProvider, config: { apiKey: '...' } },
});

VectorStoreModule.forRoot({
  store: new MemoryVectorStore(),  // 或 PineconeVectorStore / QdrantVectorStore
});
```

### 使用

```typescript
// 生成嵌入向量
const vector = await embeddingService.embed('Hello world');

// 向量存储操作
await vectorStore.upsert({ id: 'doc1', vector, content: '文档内容', collection: 'docs' });
const results = await vectorStore.search(queryVector, { topK: 5, collection: 'docs', minScore: 0.7 });
```

---

## RagModule — RAG 检索增强管道

### 配置

```typescript
// 需要先配置 EmbeddingModule 和 VectorStoreModule
RagModule.forRoot({
  collection: 'my-kb',
  chunkSize: 512,
  chunkOverlap: 50,
  topK: 5,
  minScore: 0.5,
});
```

### 文档摄取与检索

```typescript
// 摄取文档（三种来源）
await ragService.ingest({ type: 'text', content: 'Bun 是一个快速的 JS 运行时。' });
await ragService.ingest({ type: 'file', path: './docs/manual.md' });
await ragService.ingest({ type: 'url', url: 'https://bun.sh/docs' });

// 检索相关上下文
const context = await ragService.retrieve('Bun 使用什么引擎？');
// context.formatted = "[1] Bun 使用...\n\n[2] ..."

// 构建增强 Prompt
const systemPrompt = await ragService.buildContextPrompt(question);
```

---

## McpModule — MCP 协议服务端

MCP（Model Context Protocol）让 AI 客户端（Cursor、Claude Desktop 等）能够调用你的 API 方法作为工具。

### 配置

```typescript
McpModule.forRoot({
  transport: 'sse',
  path: '/mcp',
  serverInfo: { name: 'my-api', version: '1.0.0' },
});
```

### 定义 MCP 工具

```typescript
@McpTool({
  name: 'search_products',
  description: '按关键词搜索商品',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
})
async searchProducts({ query }: { query: string }) {
  return this.productService.search(query);
}
```

---

## AiGuardModule — 内容安全防护

### 配置

```typescript
AiGuardModule.forRoot({
  piiDetection: { redact: true },                      // 检测并脱敏 PII
  promptInjection: { sensitivity: 'medium' },           // 检测 Prompt 注入
  moderation: {
    openaiApiKey: process.env.OPENAI_API_KEY,          // 使用 OpenAI Moderation API
    blockCategories: ['hate', 'violence'],
  },
});
```

### 使用

```typescript
// 手动检查
const result = await guardService.check(userInput);
if (!result.allowed) throw new HttpException(400, '内容不符合规范');
const safeInput = result.sanitizedInput;  // PII 已脱敏的版本

// 或直接 throw 方式：
const safeInput = await guardService.checkOrThrow(userInput);
```

---

## 最佳实践

### 1. 本地开发使用 Ollama（零费用）

```typescript
AiModule.forRoot({
  providers: [
    { name: 'ollama', provider: OllamaProvider, config: {}, default: true },
    { name: 'openai', provider: OpenAIProvider, config: { apiKey: env.OPENAI_API_KEY! } },
  ],
  fallback: true,  // Ollama 不可用时自动切换 OpenAI
});
```

### 2. 缓存 AI 响应节省费用

```typescript
const result = await cacheService.getOrSet(
  `ai:${hash(messages)}`,
  () => aiService.complete({ messages }),
  60_000,  // 60 秒缓存
);
```

### 3. 追踪 Token 用量和成本

每个 `AiResponse` 包含 `usage`：

```typescript
const response = await aiService.complete({ messages });
console.log(response.usage);
// { promptTokens: 120, completionTokens: 50, totalTokens: 170, estimatedCostUsd: 0.00043 }
```

### 4. 生产环境始终检查用户输入

```typescript
const safeMessage = await guardService.checkOrThrow(userInput);
```

---

## AI 能力覆盖

| 能力项 | 官方模块 |
|---|---|
| 多 LLM Provider | `AiModule` |
| 文本嵌入 | `EmbeddingModule` |
| 知识库/向量搜索 | `VectorStoreModule` |
| RAG 检索管道 | `RagModule` |
| 会话记忆 | `ConversationModule` |
| Prompt 模板管理 | `PromptModule` |
| Tool/Function Calling | `AiModule`（ToolRegistry + @AiTool()） |
| 内容安全 | `AiGuardModule` |
| MCP 协议服务端 | `McpModule` |
| AI 工作流编排 | Demo 层（ai-platform-mvp 示例） |

---

## 相关资源

- [AI 模块示例](../examples/05-ai/README_ZH.md)
- [AI 中台 MVP Demo](../examples/05-ai/ai-platform-mvp/README.md)
- [Ollama 官方文档](https://ollama.ai)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [MCP 协议规范](https://modelcontextprotocol.io)
