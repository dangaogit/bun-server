import { Injectable, Inject } from '@dangao/bun-server';
import { AiService, AI_SERVICE_TOKEN, ToolRegistry, AI_TOOL_REGISTRY_TOKEN } from '@dangao/bun-server';
import { AiGuardService, AI_GUARD_SERVICE_TOKEN } from '@dangao/bun-server';
import { CalculatorTool } from './tools/calculator.tool';
import { WebSearchTool } from './tools/web-search.tool';
import { KbQueryTool } from './tools/kb-query.tool';

export interface AgentRequest {
  task: string;
  maxSteps?: number;
}

export interface AgentResponse {
  result: string;
  steps: number;
  toolsCalled: string[];
  usage: unknown;
}

@Injectable()
export class AgentService {
  private readonly registrationDone: boolean;

  public constructor(
    @Inject(AI_SERVICE_TOKEN) private readonly ai: AiService,
    @Inject(AI_TOOL_REGISTRY_TOKEN) private readonly toolRegistry: ToolRegistry,
    @Inject(AI_GUARD_SERVICE_TOKEN) private readonly guard: AiGuardService,
    private readonly calculator: CalculatorTool,
    private readonly webSearch: WebSearchTool,
    private readonly kbQuery: KbQueryTool,
  ) {
    // Register all tools
    this.toolRegistry.scanAndRegister(this.calculator);
    this.toolRegistry.scanAndRegister(this.webSearch);
    this.toolRegistry.scanAndRegister(this.kbQuery);
    this.registrationDone = true;
  }

  public async run(request: AgentRequest): Promise<AgentResponse> {
    // Safety check
    await this.guard.checkOrThrow(request.task);

    const toolsCalled: string[] = [];
    const tools = this.toolRegistry.getDefinitions();

    const systemPrompt = `You are a helpful AI agent with access to tools.
Available tools: ${tools.map((t) => t.name).join(', ')}.
Use tools when needed to answer the user's request accurately.
Always explain your reasoning before and after using tools.`;

    const response = await this.ai.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.task },
      ],
      tools,
    });

    // Collect tool names used (from the response's toolCalls if any)
    if (response.toolCalls) {
      toolsCalled.push(...response.toolCalls.map((tc) => tc.name));
    }

    return {
      result: response.content,
      steps: 1,
      toolsCalled,
      usage: response.usage,
    };
  }
}
