/**
 * 创建 Debug UI HTML 页面
 * @param basePath - Debug UI 基础路径
 */
export function createDebugHTML(basePath: string): string {
  const apiBase = `${basePath}/api`;
  const normalizePath = (p: string) => (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p);
  const base = normalizePath(basePath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Debug - Request Replay</title>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --border: #30363d;
      --accent: #58a6ff;
      --accent-hover: #79b8ff;
      --success: #3fb950;
      --warning: #d29922;
      --error: #f85149;
      --get: #3fb950;
      --post: #58a6ff;
      --put: #d29922;
      --delete: #f85149;
      --patch: #a371f7;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
    .toolbar {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.15s;
    }
    .btn:hover {
      background: var(--bg-tertiary);
    }
    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--accent-hover);
    }
    .btn-danger {
      background: var(--error);
      border-color: var(--error);
      color: #fff;
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    .toggle {
      width: 36px;
      height: 20px;
      background: var(--bg-tertiary);
      border-radius: 10px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
    }
    .toggle.active { background: var(--accent); }
    .toggle::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      top: 2px;
      left: 2px;
      transition: transform 0.2s;
    }
    .toggle.active::after { transform: translateX(16px); }
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .main-grid { grid-template-columns: 1fr; }
    }
    .panel {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .panel-header {
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary);
      font-weight: 600;
      font-size: 0.875rem;
    }
    .record-list {
      max-height: 70vh;
      overflow-y: auto;
    }
    .record-item {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.15s;
      display: grid;
      grid-template-columns: 70px 1fr 60px 70px;
      gap: 0.75rem;
      align-items: center;
      font-size: 0.8125rem;
    }
    .record-item:hover { background: var(--bg-tertiary); }
    .record-item.selected { background: var(--bg-tertiary); border-left: 3px solid var(--accent); }
    .method {
      font-weight: 600;
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .method-GET { background: rgba(63,185,80,0.2); color: var(--get); }
    .method-POST { background: rgba(88,166,255,0.2); color: var(--post); }
    .method-PUT { background: rgba(210,153,34,0.2); color: var(--warning); }
    .method-DELETE { background: rgba(248,81,73,0.2); color: var(--error); }
    .method-PATCH { background: rgba(163,113,247,0.2); color: var(--patch); }
    .path { font-family: monospace; word-break: break-all; }
    .status { font-weight: 500; }
    .status-2xx { color: var(--success); }
    .status-4xx { color: var(--warning); }
    .status-5xx { color: var(--error); }
    .detail-content {
      padding: 1rem;
      font-size: 0.8125rem;
      max-height: 70vh;
      overflow-y: auto;
    }
    .detail-section {
      margin-bottom: 1rem;
    }
    .detail-section h4 {
      margin: 0 0 0.5rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    .detail-section pre {
      margin: 0;
      padding: 0.75rem;
      background: var(--bg-primary);
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.75rem;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .empty {
      padding: 2rem;
      text-align: center;
      color: var(--text-secondary);
    }
    .loading { opacity: 0.6; pointer-events: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Debug - Request Replay</h1>
      <div class="toolbar">
        <label class="toggle-label">
          <span>Auto-refresh</span>
          <div class="toggle" id="autoRefresh" title="Toggle auto-refresh"></div>
        </label>
        <button class="btn btn-primary" id="replayBtn" disabled>Replay</button>
        <button class="btn btn-danger" id="clearBtn">Clear</button>
      </div>
    </header>
    <div class="main-grid">
      <div class="panel">
        <div class="panel-header">Recorded Requests (<span id="count">0</span>)</div>
        <div class="record-list" id="recordList"></div>
      </div>
      <div class="panel">
        <div class="panel-header">Request Details</div>
        <div class="detail-content" id="detailContent">
          <div class="empty" id="emptyDetail">Select a request to view details</div>
          <div id="detailBody" style="display:none"></div>
        </div>
      </div>
    </div>
  </div>
  <script>
    (function() {
      const apiBase = '${apiBase}';
      const recordList = document.getElementById('recordList');
      const countEl = document.getElementById('count');
      const emptyDetail = document.getElementById('emptyDetail');
      const detailBody = document.getElementById('detailBody');
      const replayBtn = document.getElementById('replayBtn');
      const clearBtn = document.getElementById('clearBtn');
      const autoRefreshToggle = document.getElementById('autoRefresh');

      let records = [];
      let selectedId = null;
      let autoRefreshInterval = null;

      function methodClass(m) {
        return 'method-' + (m || 'GET');
      }
      function statusClass(s) {
        if (s >= 200 && s < 300) return 'status-2xx';
        if (s >= 400 && s < 500) return 'status-4xx';
        if (s >= 500) return 'status-5xx';
        return '';
      }

      async function fetchRecords() {
        const res = await fetch(apiBase + '/records');
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      }

      async function fetchRecord(id) {
        const res = await fetch(apiBase + '/records/' + id);
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      }

      async function loadRecords() {
        try {
          records = await fetchRecords();
          countEl.textContent = records.length;
          renderList();
        } catch (e) {
          recordList.innerHTML = '<div class="empty">Failed to load records</div>';
        }
      }

      function renderList() {
        if (records.length === 0) {
          recordList.innerHTML = '<div class="empty">No requests recorded yet</div>';
          return;
        }
        recordList.innerHTML = records.map(function(r) {
          return '<div class="record-item' + (r.id === selectedId ? ' selected' : '') + '" data-id="' + r.id + '">' +
            '<span class="method ' + methodClass(r.request.method) + '">' + (r.request.method || 'GET') + '</span>' +
            '<span class="path">' + escapeHtml(r.request.path) + '</span>' +
            '<span class="status ' + statusClass(r.response.status) + '">' + r.response.status + '</span>' +
            '<span>' + r.timing.total + 'ms</span>' +
            '</div>';
        }).join('');
        recordList.querySelectorAll('.record-item').forEach(function(el) {
          el.addEventListener('click', function() {
            selectedId = el.dataset.id;
            loadDetail(selectedId);
            renderList();
            replayBtn.disabled = false;
          });
        });
      }

      function escapeHtml(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
      }

      async function loadDetail(id) {
        try {
          const record = await fetchRecord(id);
          emptyDetail.style.display = 'none';
          detailBody.style.display = 'block';
          const body = record.request.body !== undefined
            ? JSON.stringify(record.request.body, null, 2)
            : '(no body)';
          const respBody = record.response.bodySize + ' bytes';
          const meta = [];
          if (record.metadata.matchedRoute) meta.push('Route: ' + record.metadata.matchedRoute);
          if (record.metadata.controller) meta.push('Controller: ' + record.metadata.controller);
          if (record.metadata.methodName) meta.push('Method: ' + record.metadata.methodName);
          detailBody.innerHTML =
            '<div class="detail-section"><h4>Request Headers</h4><pre>' + escapeHtml(JSON.stringify(record.request.headers, null, 2)) + '</pre></div>' +
            '<div class="detail-section"><h4>Request Body</h4><pre>' + escapeHtml(body) + '</pre></div>' +
            '<div class="detail-section"><h4>Response</h4><pre>Status: ' + record.response.status + '\\nHeaders: ' + JSON.stringify(record.response.headers, null, 2) + '\\nBody size: ' + respBody + '</pre></div>' +
            (meta.length ? '<div class="detail-section"><h4>Metadata</h4><pre>' + escapeHtml(meta.join('\\n')) + '</pre></div>' : '');
        } catch (e) {
          detailBody.innerHTML = '<div class="empty">Failed to load details</div>';
        }
      }

      async function replay(id) {
        if (!id) return;
        replayBtn.disabled = true;
        replayBtn.textContent = 'Replaying...';
        try {
          const res = await fetch(apiBase + '/replay/' + id, { method: 'POST' });
          const data = await res.json();
          if (data.ok) {
            await loadRecords();
            if (data.newId) selectedId = data.newId;
            renderList();
            loadDetail(selectedId || id);
          } else {
            alert('Replay failed: ' + (data.error || res.statusText));
          }
        } catch (e) {
          alert('Replay failed: ' + e.message);
        }
        replayBtn.disabled = false;
        replayBtn.textContent = 'Replay';
      }

      async function clear() {
        if (!confirm('Clear all recorded requests?')) return;
        try {
          await fetch(apiBase + '/records', { method: 'DELETE' });
          records = [];
          selectedId = null;
          emptyDetail.style.display = 'block';
          detailBody.style.display = 'none';
          detailBody.innerHTML = '';
          replayBtn.disabled = true;
          loadRecords();
        } catch (e) {
          alert('Clear failed: ' + e.message);
        }
      }

      replayBtn.addEventListener('click', function() {
        if (selectedId) replay(selectedId);
      });
      clearBtn.addEventListener('click', clear);

      autoRefreshToggle.addEventListener('click', function() {
        autoRefreshToggle.classList.toggle('active');
        if (autoRefreshToggle.classList.contains('active')) {
          autoRefreshInterval = setInterval(loadRecords, 2000);
        } else {
          clearInterval(autoRefreshInterval);
          autoRefreshInterval = null;
        }
      });

      loadRecords();
    })();
  </script>
</body>
</html>`;
}
