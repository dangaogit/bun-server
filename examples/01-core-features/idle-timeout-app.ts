import {
  Application,
  Controller,
  GET,
  IdleTimeout,
  ContextParam as Ctx,
  type Context,
} from '@dangao/bun-server';

/**
 * Demonstrates:
 *  1. Global idleTimeout (TCP-level)
 *  2. Per-route @IdleTimeout (handler-level Promise.race)
 *  3. Automatic SSE keep-alive (heartbeat + server.timeout(req, 0))
 *  4. Signal cascading via ctx.signal
 */

@Controller('/api')
@IdleTimeout(4000)
class TimeoutController {
  @GET('/fast')
  public fast() {
    return { ok: true, speed: 'fast' };
  }

  @GET('/slow')
  @IdleTimeout(500)
  public async slow() {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { ok: true, speed: 'slow' };
  }

  /**
   * SSE endpoint — the framework automatically:
   *  - calls server.timeout(req, 0) to disable TCP idle timeout
   *  - injects `: keepalive\n\n` heartbeats every 5 s (per sseKeepAlive config)
   *
   * Try: curl -N http://localhost:3050/api/sse
   * Then Ctrl+C to see the stream end cleanly via signal cascade.
   */
  @GET('/sse')
  public sse(@Ctx() ctx: Context) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let count = 0;
        const timer = setInterval(() => {
          count++;
          controller.enqueue(encoder.encode(`data: tick ${count}\n\n`));
          if (count >= 20) {
            clearInterval(timer);
            controller.close();
          }
        }, 3000);

        ctx.signal.addEventListener('abort', () => {
          clearInterval(timer);
          try { controller.close(); } catch { /* already closed */ }
        }, { once: true });
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }
}

const GLOBAL_IDLE_TIMEOUT_MS = 10_000;

const app = new Application({
  port: Number(process.env.PORT ?? 3050),
  idleTimeout: GLOBAL_IDLE_TIMEOUT_MS,
  sseKeepAlive: {
    enabled: true,
    intervalMs: 5000,
  },
});

app.registerController(TimeoutController);
app.listen().then(() => {
  console.log('idle-timeout-app started');
  console.log(`global idleTimeout = ${GLOBAL_IDLE_TIMEOUT_MS}ms`);
  console.log('GET /api/fast      -> success');
  console.log('GET /api/slow      -> 408 Request Timeout');
  console.log('GET /api/sse       -> SSE stream with auto keep-alive');
});
