# idleTimeout

`idleTimeout` now supports both global and per-route configuration.

## Global idle timeout (milliseconds)

Set in `Application` options using milliseconds.  
Framework converts internally before passing to `Bun.serve`.

```ts
const app = new Application({
  port: 3000,
  idleTimeout: 15000, // ms
});
```

## Per-route timeout (milliseconds)

Use `@IdleTimeout(ms)` on controller class or handler method.

```ts
import { Controller, GET, IdleTimeout } from '@dangao/bun-server';

@Controller('/api')
@IdleTimeout(5000) // class-level default
class ApiController {
  @GET('/fast')
  public fast() {
    return { ok: true };
  }

  @GET('/slow')
  @IdleTimeout(1000) // method-level overrides class-level
  public async slow() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { ok: true };
  }
}
```

When timeout is reached, Bun Server throws `HttpException(408, "Request Timeout")`.

