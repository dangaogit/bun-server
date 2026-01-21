/**
 * Full Features Example - 完整功能示例
 * 
 * 演示功能：
 * 1. 多个中间件组合（Logger, CORS, FileUpload, StaticFile）
 * 2. 输入验证装饰器（@Validate, IsEmail, MinLength）
 * 3. 控制器级中间件（@UseMiddleware）
 * 4. 文件上传处理
 * 5. 静态文件服务
 * 6. WebSocket 集成
 * 7. ConfigModule 配置管理
 * 
 * 运行方式：
 *   bun run examples/01-core-features/full-app.ts
 * 
 * 测试：
 *   # 1. 测试搜索接口（带验证）
 *   curl http://localhost:3200/api/search?q=test
 *   curl http://localhost:3200/api/search?q=a   # 验证失败（最少 2 个字符）
 * 
 *   # 2. 测试邮件订阅（需要认证 + 邮件验证）
 *   curl -X POST http://localhost:3200/api/newsletter/subscribe \
 *     -H "Authorization: demo-token" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"test@example.com"}'
 * 
 *   # 3. 测试文件上传
 *   echo "test content" > /tmp/test.txt
 *   curl -X POST http://localhost:3200/api/files/upload \
 *     -F "file=@/tmp/test.txt"
 * 
 *   # 4. 测试静态文件
 *   curl http://localhost:3200/assets/test.txt
 * 
 *   # 5. 测试 WebSocket
 *   # 使用 websocat: websocat ws://localhost:3200/ws/chat
 *   # 或使用浏览器控制台：
 *   # ws = new WebSocket('ws://localhost:3200/ws/chat')
 *   # ws.onmessage = (e) => console.log(e.data)
 *   # ws.send('Hello')
 */

import {
  Application,
  Body,
  CONFIG_SERVICE_TOKEN,
  ConfigModule,
  ConfigService,
  Controller,
  createCorsMiddleware,
  createFileUploadMiddleware,
  createLoggerMiddleware,
  createStaticFileMiddleware,
  GET,
  Inject,
  Injectable,
  IsEmail,
  IsOptional,
  LOGGER_TOKEN,
  LoggerExtension,
  LogLevel,
  MinLength,
  OnMessage,
  Param,
  POST,
  Query,
  UseMiddleware,
  Validate,
  WebSocketGateway,
} from "@dangao/bun-server";
import type { Logger } from "@dangao/logsmith";
import type { Context } from "@dangao/bun-server";
import type { NextFunction } from "@dangao/bun-server";
import type { ServerWebSocket } from "bun";
import type { WebSocketConnectionData } from "@dangao/bun-server";

const authMiddleware = async (ctx: Context, next: NextFunction) => {
  if (ctx.getHeader("authorization") !== "demo-token") {
    ctx.setStatus(401);
    return ctx.createResponse({ error: "Unauthorized" });
  }
  return await next();
};

@Injectable()
class NewsletterService {
  private readonly subscribers = new Set<string>();

  public subscribe(email: string) {
    this.subscribers.add(email);
    return { count: this.subscribers.size };
  }
}

@Controller("/api/newsletter")
@UseMiddleware(authMiddleware)
class NewsletterController {
  public constructor(
    @Inject(NewsletterService) private readonly service: NewsletterService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  @POST("/subscribe")
  public subscribe(@Body("email") @Validate(IsEmail()) email: string) {
    this.logger.info("Subscribe request", { email });
    return this.service.subscribe(email);
  }
}

@Controller("/api/files")
class FileController {
  @POST("/upload")
  public upload(@Body() body: { files: Record<string, any> }) {
    const files = Object.keys(body.files ?? {});
    return { uploaded: files };
  }

  @GET("/download/:name")
  public download(@Param("name") name: string) {
    return Response.redirect(`/assets/${name}`);
  }
}

@Controller("/api/search")
class SearchController {
  @GET("/")
  public query(
    @Query("q") @Validate(IsOptional(), MinLength(2)) q: string | null,
  ) {
    return { query: q, results: q ? [`result for ${q}`] : [] };
  }
}

@WebSocketGateway("/ws/chat")
class ChatGateway {
  @OnMessage
  public handleMessage(
    ws: ServerWebSocket<WebSocketConnectionData>,
    message: string,
  ) {
    ws.send(`[chat] ${message}`);
  }
}

// 配置 ConfigModule
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      port: Number(process.env.PORT ?? 3200),
    },
    logger: {
      prefix: "FullExample",
      level: LogLevel.INFO,
    },
    upload: {
      maxSize: 5 * 1024 * 1024,
    },
    static: {
      root: "./public",
      prefix: "/assets",
    },
  },
});

const app = new Application();
app.registerModule(ConfigModule);

const config = app
  .getContainer()
  .resolve<ConfigService>(CONFIG_SERVICE_TOKEN);

const port =
  config.get<number>("app.port", Number(process.env.PORT ?? 3200)) ?? 3200;

app.getContainer().register(NewsletterService);

const loggerPrefix = config.get<string>("logger.prefix", "FullExample")!;
const loggerLevel = config.get<LogLevel>("logger.level", LogLevel.INFO)!;

app.registerExtension(
  new LoggerExtension({
    prefix: loggerPrefix,
    level: loggerLevel,
  }),
);
app.use(createLoggerMiddleware({ prefix: `[${loggerPrefix}]` }));
app.use(createCorsMiddleware({ origin: "*" }));

const maxUploadSize =
  config.get<number>("upload.maxSize", 5 * 1024 * 1024) ?? 5 * 1024 * 1024;
app.use(createFileUploadMiddleware({ maxSize: maxUploadSize }));

const staticRoot = config.get<string>("static.root", "./public")!;
const staticPrefix = config.get<string>("static.prefix", "/assets")!;
app.use(createStaticFileMiddleware({ root: staticRoot, prefix: staticPrefix }));

app.registerController(NewsletterController);
app.registerController(FileController);
app.registerController(SearchController);
app.registerWebSocketGateway(ChatGateway);

app.listen(port);

// ==================== 测试说明 ====================

console.log(`\n🚀 Server running at http://localhost:${port}\n`);

console.log('📋 Available features:');
console.log('  ✅ Logger middleware (request logging)');
console.log('  ✅ CORS middleware (origin: *)');
console.log('  ✅ File upload middleware (max 5MB)');
console.log('  ✅ Static file middleware (/assets)');
console.log('  ✅ Input validation (@Validate decorators)');
console.log('  ✅ Controller-level middleware (@UseMiddleware)');
console.log('  ✅ WebSocket support\n');

console.log('🧪 Try it with curl:\n');

console.log('  # 1. Search API (with validation)');
console.log(`  curl http://localhost:${port}/api/search?q=test`);
console.log(`  curl http://localhost:${port}/api/search?q=a   # Validation error (min 2 chars)\n`);

console.log('  # 2. Newsletter API (requires auth + email validation)');
console.log(`  curl -X POST http://localhost:${port}/api/newsletter/subscribe \\`);
console.log(`       -H "Authorization: demo-token" \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"email":"test@example.com"}'`);
console.log(`  # Without auth token: 401 Unauthorized`);
console.log(`  # Invalid email format: Validation error\n`);

console.log('  # 3. File Upload');
console.log(`  echo "test content" > /tmp/test.txt`);
console.log(`  curl -X POST http://localhost:${port}/api/files/upload \\`);
console.log(`       -F "file=@/tmp/test.txt"\n`);

console.log('  # 4. Static Files');
console.log(`  mkdir -p ${staticRoot}`);
console.log(`  echo "Hello from static file" > ${staticRoot}/test.txt`);
console.log(`  curl http://localhost:${port}${staticPrefix}/test.txt\n`);

console.log('  # 5. WebSocket Chat');
console.log(`  # Using websocat (install: brew install websocat):`);
console.log(`  websocat ws://localhost:${port}/ws/chat`);
console.log(`  # Or use browser console:`);
console.log(`  ws = new WebSocket('ws://localhost:${port}/ws/chat')`);
console.log(`  ws.onmessage = (e) => console.log('Received:', e.data)`);
console.log(`  ws.send('Hello from browser')\n`);

console.log('💡 Tips:');
console.log(`  - Check console for request logs (Logger middleware)`);
console.log(`  - Upload files are available at: /api/files/download/:name`);
console.log(`  - Static files are served from: ${staticRoot}`);
console.log(`  - CORS is enabled for all origins`);
