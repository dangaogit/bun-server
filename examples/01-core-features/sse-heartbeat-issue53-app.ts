/**
 * SSE heartbeat + inner ReadableStream pull() 行为复现（Issue #53）
 *
 * 内层流在单次 pull 中 enqueue 多段后再 close，Bun 上经 wrapSseWithHeartbeat
 * 包装的读端可能收不到尾部 chunk，客户端只见 : keepalive。
 *
 * 运行:
 *   bun run --cwd examples start:sse-issue53
 *   或: bun examples/01-core-features/sse-heartbeat-issue53-app.ts
 *
 * 验证:
 *   curl -N http://localhost:3170/sse/pull-same-turn
 *   curl -N http://localhost:3170/sse/async-start
 *
 * 若 Issue 成立：pull 路由可能缺少最后一条 data:；async-start 应两条都能看到。
 *
 * 若两条 curl 输出完全一致且都含 [DONE]：当前 Bun 版本可能已不再表现 #53，或条件不同；
 *   仍请记录 `bun --version` 以便对照 issue / upstream。
 *
 * 对照实验（佐证与心跳包装相关）:
 *   将下方 Application 改为 sseKeepAlive: { enabled: false } 后重试 pull 路由，
 *   若两段 data 均出现，说明与 wrapSseWithHeartbeat 读流路径叠加有关。
 */
import { Application, Controller, GET } from '@dangao/bun-server';

const encoder = new TextEncoder();

/** OpenAI 式流里常见的两段：增量 JSON + 结束标记（纯模拟，无网络） */
const ssePayloads = () => ({
  chunkA: encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'),
  chunkB: encoder.encode('data: [DONE]\n\n'),
});

function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

@Controller('/sse')
class SseIssue53Controller {
  /** 复现：同一 pull 内 enqueue + enqueue + close */
  @GET('/pull-same-turn')
  public pullSameTurn(): Response {
    const { chunkA, chunkB } = ssePayloads();
    let finished = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (finished) {
          return;
        }
        finished = true;
        controller.enqueue(chunkA);
        controller.enqueue(chunkB);
        controller.close();
      },
    });
    return sseResponse(stream);
  }

  /** 对照：async start + await 后再 close（workaround 思路） */
  @GET('/async-start')
  public asyncStart(): Response {
    const { chunkA, chunkB } = ssePayloads();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(chunkA);
        controller.enqueue(chunkB);
        await Promise.resolve();
        controller.close();
      },
    });
    return sseResponse(stream);
  }
}

const port = Number(process.env.PORT ?? 3170);
const app = new Application({
  port,
  enableSignalHandlers: false,
  sseKeepAlive: { intervalMs: 3000 },
});

app.registerController(SseIssue53Controller);
await app.listen();

console.log(`SSE Issue #53 repro on http://localhost:${port}`);
console.log('');
console.log('  curl -N http://localhost:' + port + '/sse/pull-same-turn');
console.log('  curl -N http://localhost:' + port + '/sse/async-start');
