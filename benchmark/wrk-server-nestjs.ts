import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  Module,
  Controller,
  Get,
  Post,
  Param,
  Query,
  Headers,
  Body,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import type { NestMiddleware, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

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

@Injectable()
class NoopMiddleware implements NestMiddleware {
  public use(_req: unknown, _res: unknown, next: () => void): void {
    next();
  }
}

@Injectable()
class TimestampMiddleware implements NestMiddleware {
  public use(_req: unknown, res: { setHeader(k: string, v: string): void }, next: () => void): void {
    res.setHeader('X-Timestamp', Date.now().toString());
    next();
  }
}

@Controller('api')
class PingController {
  @Get('ping')
  public ping(): { ok: true } {
    return { ok: true };
  }

  @Get('json')
  public json(): typeof LARGE_JSON {
    return LARGE_JSON;
  }

  @Get('search')
  public search(@Query('q') q: string): { query: string; results: string[] } {
    return { query: q, results: [`result:${q}`] };
  }

  @Get('headers')
  public headers(@Headers('user-agent') ua: string): { ua: string } {
    return { ua };
  }

  @Get('middleware')
  public middleware(): { ok: true } {
    return { ok: true };
  }

  @Get('io')
  public async io(): Promise<{ size: number; hash: string }> {
    const buf = await readFile(import.meta.path);
    const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16);
    return { size: buf.byteLength, hash };
  }
}

@Controller('api/users')
class UserController {
  @Get(':id')
  public getUser(@Param('id') id: string): { id: string; name: string } {
    return { id, name: `User ${id}` };
  }

  @Post()
  public createUser(@Body() body: { name: string }): { ok: true; name: string } {
    return { ok: true, name: body.name };
  }

  @Post('validated')
  public createValidated(@Body() body: { name: string; email: string }): { ok: true; name: string; email: string } {
    const { name, email } = body;
    if (typeof name !== 'string' || name.length < 2) {
      throw new BadRequestException('name must be at least 2 characters');
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new BadRequestException('invalid email');
    }
    return { ok: true, name, email };
  }
}

@Module({
  controllers: [PingController, UserController],
})
class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(NoopMiddleware, NoopMiddleware, TimestampMiddleware)
      .forRoutes('api/middleware');
  }
}

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 3302);
  const app = await NestFactory.create(AppModule, { logger: false });

  await app.listen(port);

  const httpServer = app.getHttpServer();
  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });

  console.log(`WRK_READY:${actualPort}`);
}

bootstrap();
