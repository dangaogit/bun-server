# 调试与请求重放模块

`DebugModule` 在开发模式下录制 HTTP 请求，支持查看和重放，便于调试和问题复现。

## 配置

```ts
import { DebugModule } from '@dangao/bun-server';

DebugModule.forRoot({
  enabled: true,      // 是否启用，默认 true
  maxRecords: 500,    // 最大录制数（环形缓冲区），默认 500
  recordBody: true,  // 是否录制请求体，默认 true
  path: '/_debug',   // Debug UI 路径，默认 /_debug
});
```

## 录制内容

每条记录包含：

- **request**：方法、路径、头部、请求体（可选）
- **response**：状态码、响应头、响应体大小
- **timing**：总耗时
- **metadata**：匹配路由、控制器、方法名

## Debug UI 端点

- **UI**：`GET /_debug`，调试界面
- **记录列表**：`GET /_debug/api/records`，获取所有录制
- **清空记录**：`DELETE /_debug/api/records`
- **单条记录**：`GET /_debug/api/records/:id`
- **请求重放**：`POST /_debug/api/replay/:id`，按原请求重放并返回结果

## 使用示例

```ts
import {
  Application,
  Controller,
  GET,
  POST,
  Body,
  Module,
  DebugModule,
} from '@dangao/bun-server';

@Controller('/api')
class AppController {
  @GET('/hello')
  public hello(): object {
    return { message: 'Hello!' };
  }

  @POST('/echo')
  public echo(@Body() body: unknown): unknown {
    return body;
  }
}

@Module({
  imports: [
    DebugModule.forRoot({
      enabled: true,
      maxRecords: 100,
      recordBody: true,
      path: '/_debug',
    }),
  ],
  controllers: [AppController],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
await app.listen();
// Debug UI: http://localhost:3000/_debug
// 发送请求后可在 UI 中查看录制并重放
```

建议仅在开发环境启用，生产环境可通过 `enabled: false` 关闭。
