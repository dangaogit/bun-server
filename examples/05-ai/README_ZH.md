# AI 模块示例

[English](./README.md) | **中文**

本目录包含 v2.0.0 所有 AI 官方模块的完整示例，以及一个完整的 AI 中台 MVP Demo。

## 模块专题示例

| 文件 | 模块 | 核心演示 | 端口 |
|------|------|---------|------|
| `01-basic-chat.ts` | AiModule | 多 Provider 对话、Fallback 链 | 3100 |
| `02-streaming-chat.ts` | AiModule | SSE 流式响应 | 3101 |
| `03-tool-calling.ts` | AiModule + @AiTool() | Tool Calling 循环、计算器 + 单位转换 | 3102 |
| `04-conversation-memory.ts` | ConversationModule | 多轮对话持久历史 | 3103 |
| `05-prompt-templates.ts` | PromptModule | 模板 CRUD、`{{变量}}` 插值、版本管理 | 3104 |
| `06-rag-pipeline.ts` | Embedding + VectorStore + RagModule | 文档摄取 → 语义问答 | 3105 |
| `07-mcp-server.ts` | McpModule | MCP 协议服务端、SSE 传输、工具和资源注册 | 3106 |
| `08-ai-guard.ts` | AiGuardModule | PII 脱敏、Prompt 注入检测、内容审核 | 3107 |

## AI 中台 MVP Demo

[`ai-platform-mvp/`](./ai-platform-mvp/) — 完整的 AI 中间件平台，演示所有 AI 模块协同工作：

- 多模型流式对话 + 会话记忆
- 知识库管理（上传 → RAG 处理 → 语义检索）
- Tool Calling ReAct Agent（计算器、网络搜索、知识库查询）
- Prompt 模板管理
- 内容安全防护（所有输入经 AiGuard 检查）
- MCP 协议服务端暴露
- LLMOps 指标（Token 用量、成本估算）

**端口**: 3500

## 运行前提

大多数示例使用 Ollama 进行本地免费推理，请先安装并启动：

```bash
# 安装 Ollama (macOS)
brew install ollama
ollama serve

# 下载所需模型
ollama pull llama3.2          # 对话模型
ollama pull nomic-embed-text  # 嵌入模型（RAG 示例需要）
```

若需使用 OpenAI：

```bash
export OPENAI_API_KEY=sk-...
```

## 运行示例

```bash
bun run examples/05-ai/01-basic-chat.ts
```

或使用 examples/package.json 脚本：

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

## 模块架构

所有 AI 模块遵循框架统一的抽象优先设计模式：

```
AiModule（LLM + Tool Calling）
    ├── ConversationModule（多轮记忆）
    ├── PromptModule（模板管理）
    ├── RagModule
    │   ├── EmbeddingModule
    │   └── VectorStoreModule
    ├── McpModule（MCP 协议服务端）
    └── AiGuardModule（内容安全）
```

所有 Provider 通过 Bun 原生 `fetch()` 调用 REST API，无第三方 AI SDK 依赖。

## 返回

[← 返回示例索引](../README.md)
