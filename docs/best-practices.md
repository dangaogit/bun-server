# Best Practices

**English** | [中文](./zh/best-practices.md)

---

## AI Best Practices (v2.0.0)

### Use Ollama for Local Development

Avoid API costs during development by defaulting to Ollama:

```typescript
AiModule.forRoot({
  providers: [
    { name: 'ollama', provider: OllamaProvider, config: {}, default: true },  // Free, local
    { name: 'openai', provider: OpenAIProvider, config: { apiKey: env.OPENAI_API_KEY! } },
  ],
  fallback: true,  // Fallback to OpenAI if Ollama unavailable
});
```

### Cache AI Responses

Combine AiModule with CacheModule to reduce redundant LLM calls:

```typescript
const cacheKey = `ai:${createHash('md5').update(JSON.stringify(messages)).digest('hex')}`;
const cached = await cacheService.getOrSet(cacheKey, () => aiService.complete({ messages }), 300_000);
```

### Track Token Usage

Monitor costs by logging `response.usage`:

```typescript
const response = await aiService.complete({ messages });
metricsService.increment('ai.tokens.total', response.usage.totalTokens);
metricsService.gauge('ai.cost.usd', response.usage.estimatedCostUsd ?? 0);
```

### Always Guard User Input in Production

```typescript
// Check before processing
const safeInput = await guardService.checkOrThrow(userMessage);

// Or at the controller level
@POST('/chat')
@AiGuard({ piiDetection: true, promptInjection: true })
async chat(@Body() body: { message: string }) { ... }
```

### Streaming Pattern

Keep streaming responses consistent:

```typescript
@POST('/stream')
stream(@Body() body: { message: string }): Response {
  return new Response(
    this.aiService.stream({ messages: [{ role: 'user', content: body.message }] }),
    { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } },
  );
}
```

### RAG Chunking Strategy

Choose chunker based on content type:

- **`TextChunker`** — plain text, prose documents
- **`MarkdownChunker`** — `.md`/`.mdx` files (splits by headings)

Tune `chunkSize` (512 chars recommended) and `topK` (3-5 usually sufficient).

---

## General Best Practices

See [Chinese best-practices.md](./zh/best-practices.md) for the full guide covering:

- Coding conventions and comment style
- Logger usage recommendations
- Middleware layering patterns
- Testing strategy
- Benchmark workflow
