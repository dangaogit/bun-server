# 监控仪表盘模块

`DashboardModule` 提供 Web UI 和 API，用于监控应用状态、路由和健康检查。

## 配置

```ts
import { DashboardModule } from '@dangao/bun-server';

DashboardModule.forRoot({
  path: '/_dashboard',  // UI 路径，默认 /_dashboard
  auth: {               // 可选，Basic Auth
    username: 'admin',
    password: 'admin',
  },
});
```

## 可用端点

- **UI**：`GET /_dashboard`，监控仪表盘主页面
- **系统信息**：`GET /_dashboard/api/system`，运行时间、内存、平台、Bun 版本
- **路由列表**：`GET /_dashboard/api/routes`，已注册路由及控制器、方法名
- **健康检查**：`GET /_dashboard/api/health`，若已注册 HealthModule 则执行健康指示器

## Basic Auth

配置 `auth` 后，访问上述端点需提供 Basic 认证。未配置时无需认证。

## 使用示例

```ts
import {
  Application,
  Controller,
  GET,
  Module,
  DashboardModule,
} from '@dangao/bun-server';

@Controller('/api')
class AppController {
  @GET('/hello')
  public hello(): object {
    return { message: 'Hello from Dashboard!' };
  }
}

@Module({
  imports: [
    DashboardModule.forRoot({
      path: '/_dashboard',
      auth: { username: 'admin', password: 'admin' },
    }),
  ],
  controllers: [AppController],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
await app.listen();
// Dashboard UI: http://localhost:3000/_dashboard
// 认证：admin / admin
```

## UI 界面

仪表盘 UI 展示系统信息、路由列表和健康状态，便于运维和调试。
