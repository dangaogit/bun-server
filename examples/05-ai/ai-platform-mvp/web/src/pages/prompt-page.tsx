import { FormEvent, useEffect, useState } from 'react';

import { createPrompt, deletePrompt, listPrompts, renderPrompt } from '../api/prompts';
import type { PromptTemplate } from '../types/api';

export function PromptPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [name, setName] = useState('greeting');
  const [content, setContent] = useState('Hello {{name}}, welcome to {{app}}!');
  const [description, setDescription] = useState('Greeting template');
  const [renderId, setRenderId] = useState('');
  const [variables, setVariables] = useState('{"name":"Alice","app":"AI Platform MVP"}');
  const [renderResult, setRenderResult] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const result = await listPrompts();
    setTemplates(result);
    if (!renderId && result.length > 0) {
      setRenderId(result[0].id);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await createPrompt({ name, content, description });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deletePrompt(id);
      await refresh();
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
      const result = await renderPrompt(renderId, parsed);
      setRenderResult(result.rendered);
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
