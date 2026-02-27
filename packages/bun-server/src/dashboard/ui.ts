/**
 * 创建 Dashboard HTML 页面
 * @param basePath - Dashboard 基础路径
 * @returns 完整的 HTML 页面字符串
 */
export function createDashboardHTML(basePath: string): string {
  const apiBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bun Server Dashboard</title>
  <style>
    :root {
      --bg-primary: #0f0f12;
      --bg-secondary: #18181c;
      --bg-card: #1e1e24;
      --border: #2a2a32;
      --text-primary: #e4e4e7;
      --text-secondary: #a1a1aa;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --success: #22c55e;
      --warning: #eab308;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 1.5rem;
      line-height: 1.5;
    }
    .header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .header p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      overflow: hidden;
    }
    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 0.375rem 0;
      font-size: 0.875rem;
    }
    .stat-label { color: var(--text-secondary); }
    .stat-value { font-weight: 500; }
    .status-up { color: var(--success); }
    .status-down { color: var(--error); }
    .table-wrap {
      overflow-x: auto;
      margin: 0 -1rem -1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    th, td {
      padding: 0.5rem 1rem;
      text-align: left;
      border-top: 1px solid var(--border);
    }
    th {
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .method {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .method-GET { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .method-POST { background: rgba(99, 102, 241, 0.2); color: var(--accent); }
    .method-PUT { background: rgba(234, 179, 8, 0.2); color: var(--warning); }
    .method-DELETE { background: rgba(239, 68, 68, 0.2); color: var(--error); }
    .method-PATCH { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
    .refresh-badge {
      display: inline-block;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 1rem;
    }
    .loading { color: var(--text-secondary); font-style: italic; }
    .error-msg { color: var(--error); font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Bun Server Dashboard</h1>
    <p>Monitoring UI - Auto-refresh every 5 seconds</p>
  </div>
  <div class="grid">
    <div class="card">
      <div class="card-title">System Info</div>
      <div id="system-info" class="loading">Loading...</div>
    </div>
    <div class="card">
      <div class="card-title">Health Status</div>
      <div id="health-info" class="loading">Loading...</div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Registered Routes</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Controller</th>
            <th>Method</th>
          </tr>
        </thead>
        <tbody id="routes-body">
          <tr><td colspan="4" class="loading">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="refresh-badge" id="last-update">Last update: -</div>
  <script>
    (function() {
      var base = '${apiBase}';
      function fetchJson(path) {
        return fetch(base + path).then(function(r) {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        });
      }
      function formatBytes(n) {
        if (n < 1024) return n + ' B';
        if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1048576).toFixed(2) + ' MB';
      }
      function renderSystem(data) {
        var el = document.getElementById('system-info');
        if (!data) { el.innerHTML = '<span class="error-msg">Failed to load</span>'; return; }
        el.innerHTML = '<div class="stat-row"><span class="stat-label">Uptime</span><span class="stat-value">' + Math.floor(data.uptime || 0) + 's</span></div>' +
          '<div class="stat-row"><span class="stat-label">RSS</span><span class="stat-value">' + formatBytes(data.memory?.rss || 0) + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">Heap Used</span><span class="stat-value">' + formatBytes(data.memory?.heapUsed || 0) + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">Heap Total</span><span class="stat-value">' + formatBytes(data.memory?.heapTotal || 0) + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">Platform</span><span class="stat-value">' + (data.platform || '-') + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">Bun</span><span class="stat-value">' + (data.bunVersion || '-') + '</span></div>';
      }
      function renderHealth(data) {
        var el = document.getElementById('health-info');
        if (!data) { el.innerHTML = '<span class="error-msg">Failed to load</span>'; return; }
        var statusClass = data.status === 'up' ? 'status-up' : 'status-down';
        el.innerHTML = '<div class="stat-row"><span class="stat-label">Status</span><span class="stat-value ' + statusClass + '">' + (data.status || 'unknown') + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">Timestamp</span><span class="stat-value">' + (data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '-') + '</span></div>';
      }
      function renderRoutes(data) {
        var tbody = document.getElementById('routes-body');
        if (!data || !Array.isArray(data)) {
          tbody.innerHTML = '<tr><td colspan="4" class="error-msg">Failed to load</td></tr>';
          return;
        }
        if (data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="loading">No routes registered</td></tr>';
          return;
        }
        tbody.innerHTML = data.map(function(r) {
          return '<tr><td><span class="method method-' + (r.method || 'GET') + '">' + (r.method || 'GET') + '</span></td>' +
            '<td><code>' + (r.path || '') + '</code></td>' +
            '<td>' + (r.controller || '-') + '</td>' +
            '<td>' + (r.methodName || '-') + '</td></tr>';
        }).join('');
      }
      function update() {
        fetchJson('/api/system').then(renderSystem).catch(function() { renderSystem(null); });
        fetchJson('/api/health').then(renderHealth).catch(function() { renderHealth(null); });
        fetchJson('/api/routes').then(renderRoutes).catch(function() { renderRoutes(null); });
        document.getElementById('last-update').textContent = 'Last update: ' + new Date().toLocaleTimeString();
      }
      update();
      setInterval(update, 5000);
    })();
  </script>
</body>
</html>`;
}
