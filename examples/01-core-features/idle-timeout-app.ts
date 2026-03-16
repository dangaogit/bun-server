import {
  Application,
  Controller,
  GET,
  IdleTimeout,
} from '@dangao/bun-server';

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
}

const GLOBAL_IDLE_TIMEOUT_MS = 10_000;

const app = new Application({
  port: Number(process.env.PORT ?? 3050),
  // Application idleTimeout uses milliseconds directly.
  idleTimeout: GLOBAL_IDLE_TIMEOUT_MS,
});

app.registerController(TimeoutController);
app.listen().then(() => {
  console.log('idle-timeout-app started');
  console.log(`global idleTimeout = ${GLOBAL_IDLE_TIMEOUT_MS}ms`);
  console.log('GET /api/fast -> success');
  console.log('GET /api/slow -> 408 Request Timeout');
});

