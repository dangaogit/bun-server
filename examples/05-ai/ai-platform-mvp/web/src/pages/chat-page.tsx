import { FormEvent, useState } from 'react';

import { deleteConversation, fetchHistory, sendChat, streamChat } from '../api/chat';

export function ChatPage() {
  const [message, setMessage] = useState('Hello, introduce Bun runtime in one sentence.');
  const [conversationId, setConversationId] = useState('');
  const [reply, setReply] = useState('');
  const [streamReply, setStreamReply] = useState('');
  const [historyText, setHistoryText] = useState('');
  const [useRag, setUseRag] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant. Be concise and accurate.');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await sendChat({
        message,
        conversationId: conversationId || undefined,
        useRag,
        provider,
        model: model || undefined,
        temperature,
        maxTokens,
        systemPrompt,
        openaiApiKey: openaiApiKey || undefined,
        openaiBaseUrl: openaiBaseUrl || undefined,
      });
      setConversationId(response.conversationId);
      setReply(response.reply);
    } finally {
      setLoading(false);
    }
  };

  const handleStream = async () => {
    setLoading(true);
    setStreamReply('');
    try {
      const result = await streamChat(
        {
          message,
          conversationId: conversationId || undefined,
          useRag,
          provider,
          model: model || undefined,
          temperature,
          maxTokens,
          systemPrompt,
          openaiApiKey: openaiApiKey || undefined,
          openaiBaseUrl: openaiBaseUrl || undefined,
        },
        (chunk) => {
          setStreamReply((prev) => prev + chunk);
        },
      );
      if (result.conversationId) {
        setConversationId(result.conversationId);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHistory = async () => {
    if (!conversationId) {
      return;
    }
    const history = await fetchHistory(conversationId);
    setHistoryText(JSON.stringify(history, null, 2));
  };

  const handleDelete = async () => {
    if (!conversationId) {
      return;
    }
    await deleteConversation(conversationId);
    setConversationId('');
    setHistoryText('');
    setReply('');
    setStreamReply('');
  };

  return (
    <section className='panel'>
      <h2>Chat</h2>
      <form className='form' onSubmit={handleSend}>
        <label>
          Conversation ID
          <input
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            placeholder='optional'
          />
        </label>
        <label>
          Message
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
        </label>
        <div className='grid-two'>
          <label>
            Provider
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value='openai'>openai (compatible)</option>
              <option value='ollama'>ollama</option>
            </select>
          </label>
          <label>
            Model
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder='optional' />
          </label>
        </div>
        <div className='grid-two'>
          <label>
            Temperature
            <input
              type='number'
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </label>
          <label>
            Max Tokens
            <input
              type='number'
              min={1}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          System Prompt
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
          />
        </label>
        <div className='grid-two'>
          <label>
            OpenAI Compatible Base URL
            <input
              value={openaiBaseUrl}
              onChange={(e) => setOpenaiBaseUrl(e.target.value)}
              placeholder='https://api.openai.com/v1'
            />
          </label>
          <label>
            OpenAI Compatible API Key
            <input
              type='password'
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder='sk-...'
            />
          </label>
        </div>
        <label className='checkbox-line'>
          <input type='checkbox' checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
          Use RAG context
        </label>
        <div className='actions'>
          <button type='submit' disabled={loading}>
            Send
          </button>
          <button type='button' onClick={handleStream} disabled={loading}>
            Stream
          </button>
          <button type='button' onClick={handleHistory} disabled={!conversationId || loading}>
            History
          </button>
          <button type='button' onClick={handleDelete} disabled={!conversationId || loading}>
            Delete Conversation
          </button>
        </div>
      </form>
      <div className='grid-two'>
        <article>
          <h3>Reply</h3>
          <pre>{reply || '(empty)'}</pre>
        </article>
        <article>
          <h3>Stream</h3>
          <pre>{streamReply || '(empty)'}</pre>
        </article>
      </div>
      <article>
        <h3>History JSON</h3>
        <pre>{historyText || '(empty)'}</pre>
      </article>
    </section>
  );
}
