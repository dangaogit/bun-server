# idleTimeout

`idleTimeout` 现已支持全局与路由级两种配置方式。

## 全局 idleTimeout（毫秒）

在 `Application` 中直接按毫秒设置，框架内部会转换后传给 `Bun.serve`。

```ts
const app = new Application({
  port: 3000,
  idleTimeout: 15000, // ms
});
```

## 路由级超时（毫秒）

使用 `@IdleTimeout(ms)` 装饰器配置控制器级或方法级超时。

```ts
import { Controller, GET, IdleTimeout } from '@dangao/bun-server';

@Controller('/api')
@IdleTimeout(5000) // 控制器级默认值
class ApiController {
  @GET('/fast')
  public fast() {
    return { ok: true };
  }

  @GET('/slow')
  @IdleTimeout(1000) // 方法级优先
  public async slow() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { ok: true };
  }
}
```

超时后会抛出 `HttpException(408, "Request Timeout")`。

