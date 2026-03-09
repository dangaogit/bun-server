import { useMemo, useState } from 'react';

import { ChatPage } from './pages/chat-page';
import { KnowledgePage } from './pages/knowledge-page';
import { PromptPage } from './pages/prompt-page';
import { AgentPage } from './pages/agent-page';
import { WorkflowPage } from './pages/workflow-page';

type TabKey = 'chat' | 'knowledge' | 'prompt' | 'agent' | 'workflow';

interface TabItem {
  key: TabKey;
  label: string;
}

const tabs: TabItem[] = [
  { key: 'chat', label: 'Chat' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'prompt', label: 'Prompt' },
  { key: 'agent', label: 'Agent' },
  { key: 'workflow', label: 'Workflow (X6)' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('workflow');

  const content = useMemo(() => {
    if (activeTab === 'chat') {
      return <ChatPage />;
    }
    if (activeTab === 'knowledge') {
      return <KnowledgePage />;
    }
    if (activeTab === 'prompt') {
      return <PromptPage />;
    }
    if (activeTab === 'agent') {
      return <AgentPage />;
    }
    return <WorkflowPage />;
  }, [activeTab]);

  return (
    <div className='app-shell'>
      <header className='topbar'>
        <h1>AI Platform MVP Console</h1>
        <p>Backend: http://localhost:3500 · Frontend: http://localhost:5173</p>
      </header>
      <nav className='tabs'>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type='button'
            className={activeTab === tab.key ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className='content'>{content}</main>
    </div>
  );
}
