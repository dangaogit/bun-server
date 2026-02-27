# 异步模块配置

当模块配置需要异步加载（如远程配置中心、密钥库、数据库连接等）时，可使用 `forRootAsync()` 模式。

## AsyncModuleOptions 接口

```ts
interface AsyncModuleOptions<T> {
  imports?: ModuleClass[];   // 需要导入的模块（提供 inject 依赖）
  inject?: ProviderToken[];  // 注入到 useFactory 的 provider tokens
  useFactory: (...deps: unknown[]) => T | Promise<T>;  // 异步工厂函数
}
```

## 支持的模块

- **ConfigModule**：异步加载配置
- **DatabaseModule**：异步配置数据库连接
- **CacheModule**：异步配置缓存（如 Redis 连接）

## 示例：ConfigModule.forRootAsync

```ts
import {
  Application,
  ConfigModule,
  ConfigService,
  CONFIG_SERVICE_TOKEN,
  Controller,
  GET,
  Inject,
  Module,
} from '@dangao/bun-server';

async function loadRemoteConfig(): Promise<{ app: { name: string; port: number } }> {
  console.log('[Config] 正在加载远程配置...');
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    app: { name: 'AsyncConfigApp', port: 3000 },
  };
}

@Controller('/api')
class AppController {
  public constructor(
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  @GET('/config')
  public getConfig(): object {
    return {
      name: this.config.get('app.name'),
      port: this.config.get('app.port'),
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRootAsync({
      useFactory: async () => {
        const remoteConfig = await loadRemoteConfig();
        return { defaultConfig: remoteConfig };
      },
    }),
  ],
  controllers: [AppController],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
await app.listen();
```

## 示例：DatabaseModule.forRootAsync 配合 ConfigService

```ts
import { ConfigModule, CONFIG_SERVICE_TOKEN } from '@dangao/bun-server';
import type { ConfigService } from '@dangao/bun-server';

@Module({
  imports: [
    ConfigModule.forRoot({ defaultConfig: { db: { url: '...' } } }),
    DatabaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [CONFIG_SERVICE_TOKEN],
      useFactory: (config: ConfigService) => ({
        url: config.get<string>('db.url'),
        // 其他数据库配置
      }),
    }),
  ],
})
class AppModule {}
```

异步 provider 在 `Application.listen()` 期间顺序初始化，确保在应用开始处理请求前配置已就绪。
