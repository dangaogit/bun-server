import type { TestSuite } from './suite';
import type { IPlatform } from '../../../src/platform/types';

export function runWebSocketCases(suite: TestSuite, getPlatform: () => IPlatform): void {
  const { test, expect } = suite;

  test('WebSocket server accepts connection and receives message', async () => {
    const platform = getPlatform();
    const messages: string[] = [];
    let openCalled = false;

    // Use a promise to track the server-side close event
    let resolveServerClose!: () => void;
    const serverClosePromise = new Promise<void>((r) => { resolveServerClose = r; });

    const server = await platform.http.serve({
      port: 0,
      fetch: (req, handle) => {
        const upgraded = handle.upgrade?.(req, { data: {} });
        if (upgraded) return undefined as unknown as Response;
        return new Response('not ws', { status: 400 });
      },
      websocket: {
        open: (_ws) => { openCalled = true; },
        message: (ws, msg) => {
          messages.push(msg.toString());
          ws.send('echo: ' + msg.toString());
        },
        close: (_ws) => { resolveServerClose(); },
      },
    });

    const port = server.port;

    // Connect using native WebSocket (available in both Bun and Node 22+)
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      ws.addEventListener('open', () => {
        ws.send('hello');
      });
      ws.addEventListener('message', (e) => {
        if (e.data === 'echo: hello') {
          ws.close();
        }
      });
      ws.addEventListener('close', () => {
        resolve();
      });
      ws.addEventListener('error', reject);
      setTimeout(reject, 5000);
    });

    // Wait for server-side close handler to fire before asserting
    await serverClosePromise;

    server.stop();

    expect(openCalled).toBe(true);
    expect(messages).toContain('hello');
  });
}
