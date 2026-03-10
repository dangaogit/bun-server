import { FormEvent, useEffect, useState } from 'react';

import type { PromptTemplate } from '../types/api';

const PROMPT_CACHE_KEY = 'ai-platform-mvp.prompts';

function readCachedPrompts(): PromptTemplate[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(PROMPT_CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PromptTemplate[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

function writeCachedPrompts(prompts: PromptTemplate[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(PROMPT_CACHE_KEY, JSON.stringify(prompts));
}

function renderTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value ?? '';
  });
}

export function PromptPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [name, setName] = useState('greeting');
  const [content, setContent] = useState('Hello {{name}}, welcome to {{app}}!');
  const [description, setDescription] = useState('Greeting template');
  const [renderId, setRenderId] = useState('');
  const [variables, setVariables] = useState('{"name":"Alice","app":"AI Platform MVP"}');
  const [renderResult, setRenderResult] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    const result = readCachedPrompts();
    setTemplates(result);
    if (!renderId && result.length > 0) {
      setRenderId(result[0].id);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const nextItem: PromptTemplate = {
        id: crypto.randomUUID(),
        name,
        content,
        description,
      };
      const next = [nextItem, ...readCachedPrompts()];
      writeCachedPrompts(next);
      setTemplates(next);
      if (!renderId) {
        setRenderId(nextItem.id);
      }
      setRenderResult(`Saved locally at ${now}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const next = readCachedPrompts().filter((item) => item.id !== id);
      writeCachedPrompts(next);
      setTemplates(next);
      if (renderId === id) {
        setRenderId(next[0]?.id ?? '');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRender = async () => {
    if (!renderId) {
      return;
    }
    setLoading(true);
    try {
      const parsed = JSON.parse(variables) as Record<string, string>;
      const template = templates.find((item) => item.id === renderId);
      if (!template) {
        throw new Error('Template not found in local cache');
      }
      setRenderResult(renderTemplate(template.content, parsed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className='panel'>
      <h2>Prompt Templates</h2>
      <div className='grid-two'>
        <form className='form' onSubmit={handleCreate}>
          <h3>Create Template</h3>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            Content
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          </label>
          <button type='submit' disabled={loading}>
            Create
          </button>
        </form>
        <div className='form'>
          <h3>Render Template</h3>
          <label>
            Template
            <select value={renderId} onChange={(e) => setRenderId(e.target.value)}>
              <option value=''>Select</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Variables JSON
            <textarea value={variables} onChange={(e) => setVariables(e.target.value)} rows={4} />
          </label>
          <button type='button' disabled={!renderId || loading} onClick={handleRender}>
            Render
          </button>
          <pre>{renderResult || '(empty)'}</pre>
        </div>
      </div>
      <article>
        <h3>Templates</h3>
        <div className='list'>
          {templates.map((item) => (
            <div key={item.id} className='list-row'>
              <div>
                <strong>{item.name}</strong>
                <p>{item.description || '-'}</p>
              </div>
              <button type='button' onClick={() => void handleDelete(item.id)} disabled={loading}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
