import {
  Application,
  Injectable,
  Controller,
  GET,
  Module,
  Lifecycle,
} from '@dangao/bun-server';
import type {
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@dangao/bun-server';

@Injectable()
class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  public static onBeforeCreate(): void {
    console.log('[DatabaseService] Before create');
  }

  public onAfterCreate(): void {
    console.log('[DatabaseService] After create');
  }

  public async onModuleInit(): Promise<void> {
    console.log('[DatabaseService] Connecting to database...');
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.connected = true;
    console.log('[DatabaseService] Connected!');
  }

  public async onModuleDestroy(): Promise<void> {
    console.log('[DatabaseService] Closing database connection...');
    this.connected = false;
    console.log('[DatabaseService] Disconnected.');
  }

  public onBeforeDestroy(): void {
    console.log('[DatabaseService] Before destroy');
  }

  public onAfterDestroy(): void {
    console.log('[DatabaseService] After destroy');
  }

  public isConnected(): boolean {
    return this.connected;
  }
}

@Injectable()
class AppService implements OnApplicationBootstrap, OnApplicationShutdown {
  public onApplicationBootstrap(): void {
    console.log('[AppService] Application bootstrapped successfully!');
  }

  public onApplicationShutdown(signal?: string): void {
    console.log(`[AppService] Application shutting down (signal: ${signal ?? 'none'})`);
  }
}

@Injectable({ lifecycle: Lifecycle.Scoped })
class RequestScopedService {
  private readonly requestId: string;

  public constructor() {
    this.requestId = `req-${Math.random().toString(36).slice(2, 10)}`;
    console.log(`[RequestScopedService] constructor -> ${this.requestId}`);
  }

  public static onBeforeCreate(): void {
    console.log('[RequestScopedService] Before create');
  }

  public onAfterCreate(): void {
    console.log(`[RequestScopedService] After create -> ${this.requestId}`);
  }

  public onBeforeDestroy(): void {
    console.log(`[RequestScopedService] Before destroy -> ${this.requestId}`);
  }

  public onModuleDestroy(): void {
    console.log(`[RequestScopedService] onModuleDestroy -> ${this.requestId}`);
  }

  public onAfterDestroy(): void {
    console.log(`[RequestScopedService] After destroy -> ${this.requestId}`);
  }

  public getRequestId(): string {
    return this.requestId;
  }
}

@Injectable({ lifecycle: Lifecycle.Scoped })
@Controller('/api')
class AppController implements OnModuleInit, OnModuleDestroy {
  public constructor(private readonly requestScopedService: RequestScopedService) {}

  public static onBeforeCreate(): void {
    console.log('[AppController] Before create');
  }

  public onAfterCreate(): void {
    console.log('[AppController] After create');
  }

  public onModuleInit(): void {
    console.log('[AppController] Controller initialized');
  }

  public onModuleDestroy(): void {
    console.log('[AppController] Controller destroyed');
  }

  public onBeforeDestroy(): void {
    console.log('[AppController] Before destroy');
  }

  public onAfterDestroy(): void {
    console.log('[AppController] After destroy');
  }

  @GET('/status')
  public status(): object {
    return { status: 'running', timestamp: Date.now() };
  }

  @GET('/scoped')
  public scoped(): object {
    return {
      status: 'ok',
      requestId: this.requestScopedService.getRequestId(),
      note: 'Hit this endpoint multiple times to observe scoped create/destroy hooks per request',
    };
  }
}

@Module({
  controllers: [AppController],
  providers: [DatabaseService, AppService, RequestScopedService],
})
class AppModule {}

const port = Number(process.env.PORT ?? 3000);
const app = new Application({ port });
app.registerModule(AppModule);
await app.listen();
console.log(`Lifecycle Hooks example running at http://localhost:${port}`);
console.log(`Try: curl http://localhost:${port}/api/status`);
console.log(`Try: curl http://localhost:${port}/api/scoped`);
console.log('Press Ctrl+C to see service/controller shutdown hooks');
