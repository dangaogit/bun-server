import { Injectable } from '../di/decorators';
import { Inject } from '../di/decorators';
import type {
  PromptStore,
  PromptTemplate,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  PromptModuleOptions,
} from './types';
import { PROMPT_OPTIONS_TOKEN, renderTemplate } from './types';
import { HttpException } from '../error/http-exception';

/**
 * Manages prompt templates: CRUD operations, versioning, and variable rendering.
 */
@Injectable()
export class PromptService {
  private readonly store: PromptStore;

  public constructor(
    @Inject(PROMPT_OPTIONS_TOKEN) options: PromptModuleOptions,
  ) {
    this.store = options.store!;
  }

  /**
   * Get a template by ID
   */
  public async get(id: string): Promise<PromptTemplate> {
    const template = await this.store.get(id);
    if (!template) throw new HttpException(404, `Prompt template "${id}" not found`);
    return template;
  }

  /**
   * Get a specific version of a template
   */
  public async getVersion(id: string, version: number): Promise<PromptTemplate> {
    const template = await this.store.getVersion(id, version);
    if (!template) throw new HttpException(404, `Prompt template "${id}" version ${version} not found`);
    return template;
  }

  /**
   * List all templates
   */
  public async list(): Promise<PromptTemplate[]> {
    return this.store.list();
  }

  /**
   * Create a new template
   */
  public async create(input: CreatePromptTemplateInput): Promise<PromptTemplate> {
    return this.store.create(input);
  }

  /**
   * Update a template (creates a new version)
   */
  public async update(id: string, input: UpdatePromptTemplateInput): Promise<PromptTemplate> {
    return this.store.update(id, input);
  }

  /**
   * Delete a template
   */
  public async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Render a template by replacing {{varName}} with provided values
   *
   * @example
   * ```typescript
   * const rendered = await promptService.render('greet-user', { name: 'Alice', app: 'MyApp' });
   * // "Hello, Alice! Welcome to MyApp."
   * ```
   */
  public async render(id: string, vars: Record<string, string>): Promise<string> {
    const template = await this.get(id);
    return renderTemplate(template.content, vars);
  }

  /**
   * Render a specific version of a template
   */
  public async renderVersion(id: string, version: number, vars: Record<string, string>): Promise<string> {
    const template = await this.getVersion(id, version);
    return renderTemplate(template.content, vars);
  }
}
