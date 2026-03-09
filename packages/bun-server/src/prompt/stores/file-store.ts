import type {
  PromptStore,
  PromptTemplate,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
} from '../types';
import { extractVariables } from '../types';
import { InMemoryPromptStore } from './memory-store';

export interface FilePromptStoreConfig {
  /** Directory containing JSON prompt files (default: './.prompts') */
  promptsDir?: string;
}

/**
 * File-backed prompt store — loads templates from JSON files at startup
 * and persists changes back to disk.
 *
 * Each template is stored as a separate JSON file: `{promptsDir}/{id}.json`
 *
 * File format:
 * ```json
 * {
 *   "id": "greet-user",
 *   "name": "Greet User",
 *   "content": "Hello, {{name}}! Welcome to {{app}}.",
 *   "description": "Greeting template"
 * }
 * ```
 */
export class FilePromptStore implements PromptStore {
  private readonly promptsDir: string;
  private readonly memory: InMemoryPromptStore;
  private loaded = false;

  public constructor(config: FilePromptStoreConfig = {}) {
    this.promptsDir = config.promptsDir ?? './.prompts';
    this.memory = new InMemoryPromptStore();
  }

  public async get(id: string): Promise<PromptTemplate | null> {
    await this.ensureLoaded();
    return this.memory.get(id);
  }

  public async getVersion(id: string, version: number): Promise<PromptTemplate | null> {
    await this.ensureLoaded();
    return this.memory.getVersion(id, version);
  }

  public async list(): Promise<PromptTemplate[]> {
    await this.ensureLoaded();
    return this.memory.list();
  }

  public async create(input: CreatePromptTemplateInput): Promise<PromptTemplate> {
    await this.ensureLoaded();
    const template = await this.memory.create(input);
    await this.writeFile(template);
    return template;
  }

  public async update(id: string, input: UpdatePromptTemplateInput): Promise<PromptTemplate> {
    await this.ensureLoaded();
    const template = await this.memory.update(id, input);
    await this.writeFile(template);
    return template;
  }

  public async delete(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = await this.memory.delete(id);
    if (deleted) {
      try {
        const path = `${this.promptsDir}/${id}.json`;
        await Bun.file(path).exists() && Bun.write(path, ''); // Soft delete (empty file)
      } catch {
        // ignore
      }
    }
    return deleted;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    try {
      const glob = new Bun.Glob('*.json');
      const files = Array.from(glob.scanSync(this.promptsDir));

      for (const file of files) {
        try {
          const content = await Bun.file(`${this.promptsDir}/${file}`).text();
          if (!content.trim()) continue;

          const data = JSON.parse(content) as {
            id?: string;
            name: string;
            content: string;
            description?: string;
          };

          const id = data.id ?? file.replace(/\.json$/, '');
          await this.memory.create({ id, ...data }).catch(() => {
            // Template already exists — skip
          });
        } catch {
          // Skip malformed files
        }
      }
    } catch {
      // Directory doesn't exist — start empty
    }
  }

  private async writeFile(template: PromptTemplate): Promise<void> {
    try {
      const content = JSON.stringify(
        {
          id: template.id,
          name: template.name,
          content: template.content,
          description: template.description,
          variables: extractVariables(template.content),
        },
        null,
        2,
      );
      await Bun.write(`${this.promptsDir}/${template.id}.json`, content);
    } catch {
      // Ignore write errors (e.g., read-only filesystem)
    }
  }
}
