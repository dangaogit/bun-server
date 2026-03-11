/**
 * Tool Calling Example — AiModule + @AiTool()
 *
 * Demonstrates:
 * - Defining tools with @AiTool() decorator
 * - Automatic Tool Calling loop (LLM decides when to use tools)
 * - Registering tools with ToolRegistry
 * - Multiple tool calls in a single request
 *
 * Run: bun run examples/05-ai/03-tool-calling.ts
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
  AiTool,
  ToolRegistry,
  OllamaProvider,
  AI_SERVICE_TOKEN,
  AI_TOOL_REGISTRY_TOKEN,
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
  tools: { autoDiscover: true, maxIterations: 5 },
  timeout: 60000,
});

// ── Tool Definitions ──────────────────────────────────────────────────────────

@Injectable()
class CalculatorTool {
  @AiTool({
    name: 'calculator',
    description: 'Evaluate a mathematical expression and return the numeric result.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'A math expression, e.g. "2 + 3 * 4"' },
      },
      required: ['expression'],
    },
  })
  public calculate({ expression }: { expression: string }): string {
    try {
      // Safe evaluation (numbers + operators only)
      const safe = expression.replace(/[^0-9+\-*/().\s]/g, '');
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${safe})`)() as number;
      return String(result);
    } catch {
      return 'Error: invalid expression';
    }
  }

  @AiTool({
    name: 'unit_converter',
    description: 'Convert values between units (km/miles, kg/lbs, celsius/fahrenheit)',
    parameters: {
      type: 'object',
      properties: {
        value: { type: 'number', description: 'The value to convert' },
        from: { type: 'string', description: 'Source unit: km, miles, kg, lbs, celsius, fahrenheit' },
        to: { type: 'string', description: 'Target unit' },
      },
      required: ['value', 'from', 'to'],
    },
  })
  public convert({ value, from, to }: { value: number; from: string; to: string }): string {
    const conversions: Record<string, Record<string, (v: number) => number>> = {
      km: { miles: (v) => v * 0.621371 },
      miles: { km: (v) => v * 1.60934 },
      kg: { lbs: (v) => v * 2.20462 },
      lbs: { kg: (v) => v * 0.453592 },
      celsius: { fahrenheit: (v) => v * 9 / 5 + 32 },
      fahrenheit: { celsius: (v) => (v - 32) * 5 / 9 },
    };
    const fn = conversions[from]?.[to];
    if (!fn) return `Cannot convert ${from} to ${to}`;
    return `${value} ${from} = ${fn(value).toFixed(4)} ${to}`;
  }
}

// ── Chat Controller ───────────────────────────────────────────────────────────

interface ChatRequest {
  message: string;
}

@Injectable()
class ToolChatService {
  public constructor(
    @Inject(AI_SERVICE_TOKEN) private readonly ai: AiService,
    @Inject(AI_TOOL_REGISTRY_TOKEN) private readonly toolRegistry: ToolRegistry,
    private readonly calculator: CalculatorTool,
  ) {
    // Register tools from the service instance
    this.toolRegistry.scanAndRegister(this.calculator);
  }

  public async chat(message: string) {
    const response = await this.ai.complete({
      messages: [
        { role: 'system', content: 'You are a helpful assistant with access to tools. Use them when helpful.' },
        { role: 'user', content: message },
      ],
      tools: this.toolRegistry.getDefinitions(),
    });
    return { reply: response.content, usage: response.usage };
  }
}

@Controller('/api/tools')
class ToolController {
  public constructor(private readonly service: ToolChatService) {}

  @POST('/chat')
  public async chat(@Body() body: ChatRequest) {
    return this.service.chat(body.message);
  }
}

@Module({
  imports: [AiModule],
  controllers: [ToolController],
  providers: [ToolChatService, CalculatorTool],
})
class ToolsModule {}

const port = Number(process.env.PORT ?? 3102);
const app = new Application({ port, enableSignalHandlers: false });
app.registerModule(ToolsModule);
await app.listen();

console.log(`Tool Calling API running on http://localhost:${port}`);
console.log('');
console.log('Try (asks LLM to use calculator):');
console.log(`  curl -X POST http://localhost:${port}/api/tools/chat \\`);
console.log('    -H "Content-Type: application/json" \\');
console.log('    -d \'{"message": "What is 15 * 27 + 334? Also, convert 100km to miles."}\'');
