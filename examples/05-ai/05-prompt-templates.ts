/**
 * Prompt Templates Example — PromptModule
 *
 * Demonstrates:
 * - Creating and managing reusable prompt templates
 * - Variable interpolation with {{varName}} syntax
 * - Version management (each update creates a new version)
 * - Loading templates from .prompts/ directory via FilePromptStore
 *
 * Run: bun run examples/05-ai/05-prompt-templates.ts
 */
import {
  Application,
  Controller,
  Module,
  Injectable,
  Inject,
  POST,
  GET,
  PUT,
  DELETE,
  Body,
  Param,
  PromptModule,
  PromptService,
  InMemoryPromptStore,
  PROMPT_SERVICE_TOKEN,
} from '@dangao/bun-server';

// Use in-memory store for demo (FilePromptStore would persist to .prompts/ dir)
PromptModule.forRoot({
  store: new InMemoryPromptStore(),
});

// ── Seed some templates on startup ────────────────────────────────────────────

interface CreateTemplateRequest {
  name: string;
  content: string;
  description?: string;
}

interface UpdateTemplateRequest {
  name?: string;
  content?: string;
  description?: string;
}

interface RenderRequest {
  variables: Record<string, string>;
}

@Injectable()
class TemplateSeeder {
  public constructor(
    @Inject(PROMPT_SERVICE_TOKEN) private readonly promptService: PromptService,
  ) {
    void this.seed();
  }

  private async seed() {
    await this.promptService.create({
      id: 'greeting',
      name: 'User Greeting',
      content: 'Hello {{name}}! Welcome to {{app}}. How can I help you today?',
      description: 'Standard greeting message',
    });

    await this.promptService.create({
      id: 'system-assistant',
      name: 'System Prompt: Assistant',
      content: 'You are {{role}}, a helpful assistant for {{company}}. {{instructions}}',
      description: 'Configurable system prompt for LLM',
    });
  }
}

@Controller('/api/prompts')
class PromptController {
  public constructor(
    @Inject(PROMPT_SERVICE_TOKEN) private readonly promptService: PromptService,
  ) {}

  @GET('/')
  public async list() {
    return this.promptService.list();
  }

  @GET('/:id')
  public async get(@Param('id') id: string) {
    return this.promptService.get(id);
  }

  @POST('/')
  public async create(@Body() body: CreateTemplateRequest) {
    return this.promptService.create(body);
  }

  @PUT('/:id')
  public async update(@Param('id') id: string, @Body() body: UpdateTemplateRequest) {
    return this.promptService.update(id, body);
  }

  @DELETE('/:id')
  public async delete(@Param('id') id: string) {
    await this.promptService.delete(id);
    return { deleted: true };
  }

  @POST('/:id/render')
  public async render(@Param('id') id: string, @Body() body: RenderRequest) {
    const rendered = await this.promptService.render(id, body.variables);
    return { rendered };
  }
}

@Module({
  imports: [PromptModule],
  controllers: [PromptController],
  providers: [TemplateSeeder],
})
class PromptDemoModule {}

const port = Number(process.env.PORT ?? 3104);
const app = new Application({ port, enableSignalHandlers: false });
app.registerModule(PromptDemoModule);
await app.listen();

console.log(`Prompt Templates API running on http://localhost:${port}`);
console.log('');
console.log('List templates:');
console.log(`  curl http://localhost:${port}/api/prompts/`);
console.log('');
console.log('Render a template:');
console.log(`  curl -X POST http://localhost:${port}/api/prompts/greeting/render \\`);
console.log('    -H "Content-Type: application/json" \\');
console.log('    -d \'{"variables": {"name": "Alice", "app": "BunServer"}}\'');
