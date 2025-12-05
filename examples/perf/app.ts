import 'reflect-metadata';

import {
  Application,
  Controller,
  GET,
  createLoggerMiddleware,
  LoggerExtension,
  LogLevel,
} from '@dangao/bun-server';

@Controller('/api')
class PerfController {
  @GET('/ping')
  public ping() {
    return { ok: true };
  }
}

const port = Number(process.env.PORT ?? 3300);
const app = new Application({ port });
app.registerExtension(
  new LoggerExtension({
    prefix: 'Perf',
    level: LogLevel.ERROR,
  }),
);
app.use(createLoggerMiddleware({ prefix: '[Perf]', logger: () => {} })); // 关闭日志输出影响
app.registerController(PerfController);
app.listen(port);
const actualPort = app.getServer()?.getServer()?.port ?? port;

console.log(`Perf example ready at http://localhost:${actualPort}/api/ping`);
console.log(`Use wrk: wrk -t4 -c64 -d30s http://localhost:${actualPort}/api/ping`);

