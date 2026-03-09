/**
 * A versioned prompt template with variable interpolation
 */
export interface PromptTemplate {
  id: string;
  name: string;
  /** Template content with {{variable}} placeholders */
  content: string;
  /** Current version number (starts at 1, increments on each update) */
  version: number;
  /** Declared variable names (auto-extracted from content) */
  variables: string[];
  /** Optional description */
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a prompt template
 */
export interface CreatePromptTemplateInput {
  id?: string;
  name: string;
  content: string;
  description?: string;
}

/**
 * Input for updating a prompt template (creates new version)
 */
export interface UpdatePromptTemplateInput {
  name?: string;
  content?: string;
  description?: string;
}

/**
 * Abstract prompt store interface
 */
export interface PromptStore {
  get(id: string): Promise<PromptTemplate | null>;
  getVersion(id: string, version: number): Promise<PromptTemplate | null>;
  list(): Promise<PromptTemplate[]>;
  create(input: CreatePromptTemplateInput): Promise<PromptTemplate>;
  update(id: string, input: UpdatePromptTemplateInput): Promise<PromptTemplate>;
  delete(id: string): Promise<boolean>;
}

/**
 * PromptModule configuration
 */
export interface PromptModuleOptions {
  store?: PromptStore;
  /**
   * Preload templates on module init
   * (only used by FilePromptStore, which loads from promptsDir)
   */
  promptsDir?: string;
}

export const PROMPT_SERVICE_TOKEN = Symbol('@dangao/bun-server:prompt:service');
export const PROMPT_OPTIONS_TOKEN = Symbol('@dangao/bun-server:prompt:options');

/**
 * Extract variable names from template content
 * Matches {{varName}} patterns
 */
export function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1]!);
  }
  return Array.from(vars);
}

/**
 * Render a template by replacing {{varName}} with provided values
 */
export function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}
