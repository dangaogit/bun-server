# Lifecycle Hooks

Bun Server supports lifecycle hooks that let providers participate in application startup and shutdown. Implement the appropriate interface on your injectable services.

## Interfaces

| Interface | Method | When Called |
|-----------|--------|-------------|
| `OnModuleInit` | `onModuleInit()` | After all module providers are registered |
| `OnModuleDestroy` | `onModuleDestroy()` | During shutdown (reverse order) |
| `OnApplicationBootstrap` | `onApplicationBootstrap()` | After all modules init, before server listens |
| `OnApplicationShutdown` | `onApplicationShutdown(signal?)` | When graceful shutdown begins |

## Execution Order

**Startup**: `onModuleInit` (all modules) -> `onApplicationBootstrap` (all modules) -> server starts

**Shutdown**: `onApplicationShutdown` (reverse order) -> `onModuleDestroy` (reverse order)

## Example: DatabaseService with init/destroy

```ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@dangao/bun-server';

@Injectable()
class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  public async onModuleInit(): Promise<void> {
    console.log('[DatabaseService] Connecting...');
    await this.connect();
    this.connected = true;
  }

  public async onModuleDestroy(): Promise<void> {
    console.log('[DatabaseService] Closing connection...');
    await this.disconnect();
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  private async connect(): Promise<void> {
    // Open DB connection
  }

  private async disconnect(): Promise<void> {
    // Close DB connection
  }
}
```

## Example: Application-level hooks

```ts
@Injectable()
class AppService implements OnApplicationBootstrap, OnApplicationShutdown {
  public onApplicationBootstrap(): void {
    console.log('Application bootstrapped');
  }

  public onApplicationShutdown(signal?: string): void {
    console.log(`Shutting down (signal: ${signal ?? 'none'})`);
  }
}
```
