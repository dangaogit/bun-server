# 生命周期钩子

Bun Server 支持组件级生命周期钩子，可让 `@Injectable` / `@Controller` 从创建前到销毁后执行自定义逻辑。

## 接口定义

- **ComponentClassBeforeCreate**：`static onBeforeCreate()`，组件实例创建前调用
- **OnAfterCreate**：`onAfterCreate()`，组件实例创建并完成后处理后调用
- **OnModuleInit**：`onModuleInit()`，在模块所有组件初始化阶段调用
- **OnApplicationBootstrap**：`onApplicationBootstrap()`，在所有模块初始化完成后、服务器开始监听前调用
- **OnApplicationShutdown**：`onApplicationShutdown(signal?)`，在优雅停机开始时调用
- **OnBeforeDestroy**：`onBeforeDestroy()`，在 `onModuleDestroy()` 前调用（反向顺序）
- **OnModuleDestroy**：`onModuleDestroy()`，在应用关闭时调用（反向顺序）
- **OnAfterDestroy**：`onAfterDestroy()`，在 `onModuleDestroy()` 后调用（反向顺序）

## 执行顺序

**创建阶段（每个组件实例）**：`onBeforeCreate`（静态）→ 实例化 → `onAfterCreate`

**启动阶段**：`onModuleInit` → `onApplicationBootstrap`

**关闭阶段**：`onApplicationShutdown` → `onBeforeDestroy` → `onModuleDestroy` → `onAfterDestroy`（均为反向顺序，即后注册的先执行）

对于 `Lifecycle.Scoped` 组件，请求上下文结束时会自动触发其销毁钩子。

## 组件去重行为

当同一个组件实例通过多个 token 重复注册/导出时，生命周期钩子只会执行一次，避免共享单例出现重复副作用。

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

  public static onBeforeCreate(): void {
    console.log('[DatabaseService] 创建前');
  }

  public onAfterCreate(): void {
    console.log('[DatabaseService] 创建后');
  }

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

  public onBeforeDestroy(): void {
    console.log('[DatabaseService] 销毁前');
  }

  public onAfterDestroy(): void {
    console.log('[DatabaseService] 销毁后');
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
  public static onBeforeCreate(): void {
    console.log('[AppController] 创建前');
  }

  public onAfterCreate(): void {
    console.log('[AppController] 创建后');
  }

  public onBeforeDestroy(): void {
    console.log('[AppController] 销毁前');
  }

  public onAfterDestroy(): void {
    console.log('[AppController] 销毁后');
  }

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

按 Ctrl+C 触发关闭时，将依次执行 `onApplicationShutdown`、`onBeforeDestroy`、`onModuleDestroy`、`onAfterDestroy`。
