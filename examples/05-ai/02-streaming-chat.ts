/**
 * Streaming Chat Example — AiModule
 *
 * Demonstrates:
 * - Streaming LLM responses via Server-Sent Events (SSE)
 * - Returning ReadableStream directly from a controller method
 * - Client-side SSE consumption
 *
 * Run: bun run examples/05-ai/02-streaming-chat.ts
 */
import {
  Application,
  Controller,
  Module,
  Injectable,
  Inject,
  POST,
  Body,
  AiModule,
  AiService,
  OllamaProvider,
  AI_SERVICE_TOKEN,
} from '@dangao/bun-server';

AiModule.forRoot({
  providers: [
    {
      name: 'ollama',
      provider: OllamaProvider,
      config: { defaultModel: 'llama3.2' },
      default: true,
    },
  ],
  timeout: 60000,
});

interface StreamRequest {
  message: string;
}

@Injectable()
class StreamingChatService {
  public constructor(
    @Inject(AI_SERVICE_TOKEN) private readonly ai: AiService,
  ) {}

  public stream(message: string): ReadableStream<Uint8Array> {
    return this.ai.stream({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message },
      ],
    });
  }
}

@Controller('/api/stream')
class StreamingController {
  public constructor(private readonly service: StreamingChatService) {}

  @POST('/')
  public chat(@Body() body: StreamRequest): Response {
    const stream = this.service.stream(body.message);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}

@Module({
  imports: [AiModule],
  controllers: [StreamingController],
  providers: [StreamingChatService],
})
class StreamingModule {}

const port = Number(process.env.PORT ?? 3101);
const app = new Application({ port, enableSignalHandlers: false });
app.registerModule(StreamingModule);
await app.listen();

console.log(`Streaming chat API running on http://localhost:${port}`);
console.log('');
console.log('Try (curl streams the SSE response):');
console.log(`  curl -X POST http://localhost:${port}/api/stream/ \\`);
console.log('    -H "Content-Type: application/json" \\');
console.log('    -d \'{"message": "Count slowly from 1 to 5."}\'');
