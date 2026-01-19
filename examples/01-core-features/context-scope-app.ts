import {
  Application,
  CONTEXT_SERVICE_TOKEN,
  ContextParam,
  ContextService,
  Controller,
  GET,
  Inject,
  Injectable,
  Lifecycle,
  Module,
  Param,
} from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

/**
 * 请求作用域服务：每个请求一个实例
 */
@Injectable({ lifecycle: Lifecycle.Scoped })
class RequestIdService {
  public readonly requestId: string;

  public constructor() {
    this.requestId = crypto.randomUUID();
  }
}

/**
 * 普通单例服务：在服务层通过 ContextService 访问当前请求的 Context
 */
@Injectable()
class UserAgentService {
  public constructor(
    @Inject(CONTEXT_SERVICE_TOKEN)
    private readonly contextService: ContextService,
  ) {}

  public getUserAgent(): string {
    return this.contextService.getHeader('User-Agent') ?? 'unknown';
  }
}

@Controller('/api/context')
class ContextDemoController {
  public constructor(
    private readonly requestIdService: RequestIdService,
    private readonly userAgentService: UserAgentService,
  ) {}

  /**
   * 演示：
   * - @Context() 参数注入当前 Context
   * - RequestIdService（Scoped）在同一请求内复用、不同请求隔离
   * - UserAgentService 在 service 层使用 ContextService 访问 header
   */
  @GET('/echo/:id')
  public echo(
    @Param('id') id: string,
    @ContextParam() context: Context,
  ) {
    return {
      id,
      path: context.path,
      method: context.method,
      requestId: this.requestIdService.requestId,
      userAgent: this.userAgentService.getUserAgent(),
      query: context.getQueryAll(),
    };
  }
}

@Module({
  controllers: [ContextDemoController],
  providers: [RequestIdService, UserAgentService],
})
class AppModule {}

const port = Number(process.env.PORT ?? 3500);
const app = new Application({ port });
app.registerModule(AppModule);
await app.listen(port);

console.log(`Server running on http://localhost:${port}`);
console.log(`Try: curl 'http://localhost:${port}/api/context/echo/123?name=alice' -H 'User-Agent: demo'`);


