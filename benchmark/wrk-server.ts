import {
  Application,
  Controller,
  GET,
  POST,
  Body,
  Query,
  Param,
  Header,
  Validate,
  IsString,
  IsEmail,
  MinLength,
  UseMiddleware,
  createLoggerMiddleware,
  createCorsMiddleware,
  LoggerExtension,
  LogLevel,
} from '@dangao/bun-server';
import type { Middleware } from '@dangao/bun-server';

const LARGE_JSON = {
  users: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i % 3 === 0 ? 'admin' : 'user',
    active: i % 5 !== 0,
  })),
  total: 20,
  page: 1,
  pageSize: 20,
};

const noopMiddleware: Middleware = async (_ctx, next) => next();

const timestampMiddleware: Middleware = async (ctx, next) => {
  ctx.setHeader('X-Timestamp', Date.now().toString());
  return next();
};

@Controller('/api')
class PingController {
  @GET('/ping')
  public ping(): { ok: true } {
    return { ok: true };
  }

  @GET('/json')
  public json(): typeof LARGE_JSON {
    return LARGE_JSON;
  }
}

@Controller('/api/users')
class UserController {
  @GET('/:id')
  public getUser(@Param('id') id: string): { id: string; name: string } {
    return { id, name: `User ${id}` };
  }

  @POST('/')
  public createUser(@Body() body: { name: string; email: string }): { ok: true; name: string } {
    return { ok: true, name: body.name };
  }

  @POST('/validated')
  public createValidated(
    @Body('name') @Validate(IsString(), MinLength(2)) name: string,
    @Body('email') @Validate(IsString(), IsEmail()) email: string,
  ): { ok: true; name: string; email: string } {
    return { ok: true, name, email };
  }
}

@Controller('/api')
class MiscController {
  @GET('/search')
  public search(@Query('q') q: string): { query: string; results: string[] } {
    return { query: q, results: [`result:${q}`] };
  }

  @GET('/headers')
  public headers(@Header('user-agent') ua: string): { ua: string } {
    return { ua };
  }

  @GET('/middleware')
  @UseMiddleware(noopMiddleware, noopMiddleware, timestampMiddleware)
  public middleware(): { ok: true } {
    return { ok: true };
  }

  @GET('/io')
  public async io(): Promise<{ size: number; hash: string }> {
    const file = Bun.file(import.meta.path);
    const buf = await file.arrayBuffer();
    const hash = Bun.hash(buf).toString(16);
    return { size: buf.byteLength, hash };
  }
}

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 3300);
  const app = new Application({ port });

  app.registerExtension(
    new LoggerExtension({ prefix: 'Bench', level: LogLevel.ERROR }),
  );
  app.use(createLoggerMiddleware({ prefix: '[Bench]', logger: () => {} }));
  app.use(createCorsMiddleware());

  app.registerController(PingController);
  app.registerController(UserController);
  app.registerController(MiscController);

  await app.listen(port);
  const actualPort = app.getServer()?.getServer()?.port ?? port;

  console.log(`WRK_READY:${actualPort}`);
}

bootstrap();
