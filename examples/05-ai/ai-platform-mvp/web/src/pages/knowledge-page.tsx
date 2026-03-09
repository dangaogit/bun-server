import { FormEvent, useState } from 'react';

import { ingestKnowledge, searchKnowledge } from '../api/knowledge';

export function KnowledgePage() {
  const [text, setText] = useState('Bun uses JavaScriptCore instead of V8.');
  const [url, setUrl] = useState('');
  const [collection, setCollection] = useState('platform-kb');
  const [query, setQuery] = useState('What engine does Bun use?');
  const [ingestResult, setIngestResult] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIngest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await ingestKnowledge({
        text: text || undefined,
        url: url || undefined,
        collection: collection || undefined,
      });
      setIngestResult(JSON.stringify(result, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await searchKnowledge({ query, collection: collection || undefined });
      setSearchResult(JSON.stringify(result, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className='panel'>
      <h2>Knowledge Base</h2>
      <div className='grid-two'>
        <form className='form' onSubmit={handleIngest}>
          <h3>Ingest</h3>
          <label>
            Collection
            <input value={collection} onChange={(e) => setCollection(e.target.value)} />
          </label>
          <label>
            Text
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
          </label>
          <label>
            URL
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder='optional' />
          </label>
          <button type='submit' disabled={loading}>
            Ingest
          </button>
        </form>
        <form className='form' onSubmit={handleSearch}>
          <h3>Search</h3>
          <label>
            Query
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type='submit' disabled={loading}>
            Search
          </button>
        </form>
      </div>
      <div className='grid-two'>
        <article>
          <h3>Ingest Result</h3>
          <pre>{ingestResult || '(empty)'}</pre>
        </article>
        <article>
          <h3>Search Result</h3>
          <pre>{searchResult || '(empty)'}</pre>
        </article>
      </div>
    </section>
  );
}
