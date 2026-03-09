import { FormEvent, useState } from 'react';

import { runAgent } from '../api/agent';

export function AgentPage() {
  const [task, setTask] = useState('Calculate 15 * 27 + 334 and explain what Bun runtime is.');
  const [maxSteps, setMaxSteps] = useState(8);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await runAgent({ task, maxSteps });
      setResult(JSON.stringify(response, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className='panel'>
      <h2>Agent Run</h2>
      <form className='form' onSubmit={handleRun}>
        <label>
          Task
          <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={4} />
        </label>
        <label>
          Max Steps
          <input
            type='number'
            value={maxSteps}
            min={1}
            max={30}
            onChange={(e) => setMaxSteps(Number(e.target.value))}
          />
        </label>
        <button type='submit' disabled={loading}>
          Run Agent
        </button>
      </form>
      <article>
        <h3>Response</h3>
        <pre>{result || '(empty)'}</pre>
      </article>
    </section>
  );
}
