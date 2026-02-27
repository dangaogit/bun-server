import {
  Application,
  Injectable,
  Controller,
  GET,
  Module,
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

@Controller('/api')
class AppController {
  @GET('/status')
  public status(): object {
    return { status: 'running', timestamp: Date.now() };
  }
}

@Module({
  controllers: [AppController],
  providers: [DatabaseService, AppService],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
await app.listen();
console.log('Lifecycle Hooks example running at http://localhost:3000');
console.log('Try: curl http://localhost:3000/api/status');
console.log('Press Ctrl+C to see shutdown hooks');
