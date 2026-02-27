import {
  Application,
  Controller,
  GET,
  LoggerExtension,
  LogLevel,
  createLoggerMiddleware,
} from '@dangao/bun-server';

const WORKER_ID = process.env.WORKER_ID ?? '0';

@Controller('/api')
class PingController {
  @GET('/ping')
  public ping(): { ok: true; worker: string } {
    return { ok: true, worker: WORKER_ID };
  }
}

const port = Number(process.env.PORT ?? 3300);
const app = new Application({ port, reusePort: true });

app.registerExtension(
  new LoggerExtension({ prefix: `Worker#${WORKER_ID}`, level: LogLevel.ERROR }),
);
app.use(createLoggerMiddleware({ prefix: `[W${WORKER_ID}]`, logger: () => {} }));
app.registerController(PingController);

await app.listen(port);
console.log(`Worker #${WORKER_ID} listening on port ${port}`);
