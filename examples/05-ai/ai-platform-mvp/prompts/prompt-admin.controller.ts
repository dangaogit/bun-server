import { Controller, GET, POST, PUT, DELETE, Body, Param, Inject } from '@dangao/bun-server';
import { PromptService, PROMPT_SERVICE_TOKEN } from '@dangao/bun-server';

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

@Controller('/api/prompts')
export class PromptAdminController {
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
