
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
