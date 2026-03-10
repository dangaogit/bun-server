import { Controller, GET, POST, PUT, DELETE, Body, Param, HttpException } from '@dangao/bun-server';

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
  @GET('/')
  public async list() {
    throw new HttpException(
      410,
      'Server-side prompt storage is disabled. Use client cache instead.',
    );
  }

  @GET('/:id')
  public async get(@Param('id') id: string) {
    void id;
    throw new HttpException(
      410,
      'Server-side prompt storage is disabled. Use client cache instead.',
    );
  }

  @POST('/')
  public async create(@Body() body: CreateTemplateRequest) {
    void body;
    throw new HttpException(
      410,
      'Server-side prompt storage is disabled. Use client cache instead.',
    );
  }

  @PUT('/:id')
  public async update(@Param('id') id: string, @Body() body: UpdateTemplateRequest) {
    void id;
    void body;
    throw new HttpException(
      410,
      'Server-side prompt storage is disabled. Use client cache instead.',
    );
  }

  @DELETE('/:id')
  public async delete(@Param('id') id: string) {
    void id;
    throw new HttpException(
      410,
      'Server-side prompt storage is disabled. Use client cache instead.',
    );
  }

  @POST('/:id/render')
  public async render(@Param('id') id: string, @Body() body: RenderRequest) {
    void id;
    void body;
    throw new HttpException(
      410,
      'Server-side prompt rendering is disabled. Render prompts in client cache.',
    );
  }
}
