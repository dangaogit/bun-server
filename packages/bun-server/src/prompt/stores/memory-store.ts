import type {
  PromptStore,
  PromptTemplate,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
} from '../types';
import { extractVariables } from '../types';

/**
 * In-memory prompt store. Supports versioning via a separate history map.
 */
export class InMemoryPromptStore implements PromptStore {
  private readonly templates = new Map<string, PromptTemplate>();
  /** id → version → template snapshot */
  private readonly history = new Map<string, Map<number, PromptTemplate>>();

  public async get(id: string): Promise<PromptTemplate | null> {
    return this.templates.get(id) ?? null;
  }

  public async getVersion(id: string, version: number): Promise<PromptTemplate | null> {
    return this.history.get(id)?.get(version) ?? null;
  }

  public async list(): Promise<PromptTemplate[]> {
    return Array.from(this.templates.values());
  }

  public async create(input: CreatePromptTemplateInput): Promise<PromptTemplate> {
    const id = input.id ?? crypto.randomUUID();
    if (this.templates.has(id)) {
      throw new Error(`Prompt template "${id}" already exists`);
    }
    const now = new Date();
    const template: PromptTemplate = {
      id,
      name: input.name,
      content: input.content,
      version: 1,
      variables: extractVariables(input.content),
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(id, template);
    this.saveVersion(template);
    return { ...template };
  }

  public async update(id: string, input: UpdatePromptTemplateInput): Promise<PromptTemplate> {
    const existing = this.templates.get(id);
    if (!existing) throw new Error(`Prompt template "${id}" not found`);

    const now = new Date();
    const content = input.content ?? existing.content;
    const updated: PromptTemplate = {
      ...existing,
      name: input.name ?? existing.name,
      content,
      description: input.description ?? existing.description,
      version: existing.version + 1,
      variables: extractVariables(content),
      updatedAt: now,
    };
    this.templates.set(id, updated);
    this.saveVersion(updated);
    return { ...updated };
  }

  public async delete(id: string): Promise<boolean> {
    const existed = this.templates.delete(id);
    this.history.delete(id);
    return existed;
  }

  private saveVersion(template: PromptTemplate): void {
    if (!this.history.has(template.id)) {
      this.history.set(template.id, new Map());
    }
    this.history.get(template.id)!.set(template.version, { ...template });
  }
}
