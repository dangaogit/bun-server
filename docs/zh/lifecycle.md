# 生命周期钩子

Bun Server 提供四个生命周期接口，用于在模块和应用启动、关闭时执行初始化或清理逻辑。

## 接口定义

- **OnModuleInit**：`onModuleInit()`，在模块所有 providers 注册完成后调用
- **OnModuleDestroy**：`onModuleDestroy()`，在应用关闭时调用（反向顺序）
- **OnApplicationBootstrap**：`onApplicationBootstrap()`，在所有模块初始化完成后、服务器开始监听前调用
- **OnApplicationShutdown**：`onApplicationShutdown(signal?)`，在优雅停机开始时调用

## 执行顺序

**启动阶段**：`onModuleInit` → `onApplicationBootstrap`

**关闭阶段**：`onApplicationShutdown` → `onModuleDestroy`（均为反向顺序，即后注册的先执行）

## 示例：DatabaseService 的初始化和销毁

```ts
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
    console.log('[DatabaseService] 正在连接数据库...');
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.connected = true;
    console.log('[DatabaseService] 已连接');
  }

  public async onModuleDestroy(): Promise<void> {
    console.log('[DatabaseService] 正在关闭数据库连接...');
    this.connected = false;
    console.log('[DatabaseService] 已断开');
  }

  public isConnected(): boolean {
    return this.connected;
  }
}

@Injectable()
class AppService implements OnApplicationBootstrap, OnApplicationShutdown {
  public onApplicationBootstrap(): void {
    console.log('[AppService] 应用已启动');
  }

  public onApplicationShutdown(signal?: string): void {
    console.log(`[AppService] 应用正在关闭 (signal: ${signal ?? 'none'})`);
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
```

按 Ctrl+C 触发关闭时，将依次执行 `onApplicationShutdown` 和 `onModuleDestroy`。
