import {
  Application,
  Body,
  ConfigModule,
  Controller,
  createSessionMiddleware,
  GET,
  Inject,
  Injectable,
  LoggerModule,
  LogLevel,
  Module,
  Param,
  POST,
  Session,
  SESSION_SERVICE_TOKEN,
  SessionModule,
  SessionService,
} from '@dangao/bun-server';
import type { Session as SessionType } from '@dangao/bun-server';

/**
 * 用户服务
 */
@Injectable()
class UserService {
  private readonly users = new Map<string, { id: string; username: string; password: string }>([
    ['1', { id: '1', username: 'alice', password: 'password123' }],
    ['2', { id: '2', username: 'bob', password: 'password456' }],
  ]);

  public findByUsername(username: string): { id: string; username: string; password: string } | undefined {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  public findById(id: string): { id: string; username: string; password: string } | undefined {
    return this.users.get(id);
  }
}

/**
 * 认证服务
 */
@Injectable()
class AuthService {
  public constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(SESSION_SERVICE_TOKEN) private readonly sessionService: SessionService,
  ) {}

  public async login(username: string, password: string): Promise<{ sessionId: string; user: { id: string; username: string } } | null> {
    const user = this.userService.findByUsername(username);
    if (!user || user.password !== password) {
      return null;
    }

    // 创建 Session
    const session = await this.sessionService.create({
      userId: user.id,
      username: user.username,
      loginTime: Date.now(),
    });

    return {
      sessionId: session.id,
      user: { id: user.id, username: user.username },
    };
  }

  public async logout(sessionId: string): Promise<void> {
    await this.sessionService.delete(sessionId);
  }

  public async getSession(sessionId: string): Promise<SessionType | undefined> {
    return await this.sessionService.get(sessionId);
  }
}

@Controller('/api/auth')
class AuthController {
  public constructor(
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @POST('/login')
  public async login(@Body() body: { username: string; password: string }) {
    const result = await this.authService.login(body.username, body.password);
    if (!result) {
      return { error: 'Invalid credentials' };
    }

    // Session ID 会通过 Cookie 自动设置（由中间件处理）
    return {
      message: 'Login successful',
      user: result.user,
      sessionId: result.sessionId,
    };
  }

  @POST('/logout')
  public async logout(@Session() session: SessionType | undefined) {
    if (!session) {
      return { error: 'Not logged in' };
    }

    await this.authService.logout(session.id);
    return { message: 'Logout successful' };
  }

  @GET('/me')
  public async getCurrentUser(@Session() session: SessionType | undefined) {
    if (!session) {
      return { error: 'Not authenticated' };
    }

    return {
      userId: session.data.userId,
      username: session.data.username,
      loginTime: session.data.loginTime,
    };
  }
}

@Controller('/api/cart')
class CartController {
  public constructor(
    @Inject(SESSION_SERVICE_TOKEN) private readonly sessionService: SessionService,
  ) {}

  @GET('/')
  public async getCart(@Session() session: SessionType | undefined) {
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const cart = (session.data.cart as string[]) || [];
    return { items: cart };
  }

  @POST('/add')
  public async addToCart(
    @Session() session: SessionType | undefined,
    @Body() body: { item: string },
  ) {
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const cart = ((session.data.cart as string[]) || []) as string[];
    cart.push(body.item);

    // 更新 Session 数据
    await this.sessionService.setValue(session.id, 'cart', cart);

    return { message: 'Item added to cart', cart };
  }

  @POST('/clear')
  public async clearCart(@Session() session: SessionType | undefined) {
    if (!session) {
      return { error: 'Not authenticated' };
    }

    await this.sessionService.setValue(session.id, 'cart', []);
    return { message: 'Cart cleared' };
  }
}

@Controller('/api/session')
class SessionController {
  public constructor(
    @Inject(SESSION_SERVICE_TOKEN) private readonly sessionService: SessionService,
  ) {}

  @GET('/info')
  public async getSessionInfo(@Session() session: SessionType | undefined) {
    if (!session) {
      return { error: 'No active session' };
    }

    return {
      sessionId: session.id,
      createdAt: new Date(session.createdAt).toISOString(),
      lastAccessedAt: new Date(session.lastAccessedAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      data: session.data,
    };
  }

  @POST('/set')
  public async setSessionValue(
    @Session() session: SessionType | undefined,
    @Body() body: { key: string; value: unknown },
  ) {
    if (!session) {
      return { error: 'Not authenticated' };
    }

    await this.sessionService.setValue(session.id, body.key, body.value);
    return { message: 'Value set', key: body.key };
  }

  @GET('/get/:key')
  public async getSessionValue(
    @Session() session: SessionType | undefined,
    @Param('key') key: string,
  ) {
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const value = await this.sessionService.getValue(session.id, key);
    return { key, value };
  }
}

@Module({
  controllers: [AuthController, CartController, SessionController],
  providers: [UserService, AuthService],
  exports: [UserService, AuthService],
})
class AppModule {}

const port = Number(process.env.PORT ?? 3400);

// 配置 ConfigModule
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: 'Session Example App',
      port,
    },
  },
});

// 配置 Logger 模块
LoggerModule.forRoot({
  logger: {
    prefix: 'SessionExample',
    level: LogLevel.INFO,
  },
  enableRequestLogging: true,
});

// 配置 Session 模块
SessionModule.forRoot({
  name: 'sessionId', // Cookie 名称
  maxAge: 86400000, // 24 小时
  rolling: true, // 每次访问时更新过期时间
  cookie: {
    secure: false, // 开发环境设为 false，生产环境应设为 true
    httpOnly: true, // 防止 JavaScript 访问
    path: '/',
    sameSite: 'lax',
  },
});

// 应用模块
@Module({
  imports: [ConfigModule, LoggerModule, SessionModule],
  controllers: [AuthController, CartController, SessionController],
  providers: [UserService, AuthService],
})
class RootModule {}

const app = new Application({ port });

// 先注册模块，确保 SessionModule 已加载
app.registerModule(RootModule);

// 注册 Session 中间件（必须在注册模块之后，这样才能从容器中解析 SessionService）
const container = app.getContainer();
app.use(createSessionMiddleware(container));

app.listen(port);

console.log(`🚀 Session Example Server running on http://localhost:${port}`);
console.log(`\n📝 Available endpoints:`);
console.log(`  POST /api/auth/login       - Login (creates session)`);
console.log(`  POST /api/auth/logout      - Logout (destroys session)`);
console.log(`  GET  /api/auth/me          - Get current user (requires session)`);
console.log(`  GET  /api/cart             - Get cart items (requires session)`);
console.log(`  POST /api/cart/add         - Add item to cart (requires session)`);
console.log(`  POST /api/cart/clear       - Clear cart (requires session)`);
console.log(`  GET  /api/session/info     - Get session information`);
console.log(`  POST /api/session/set      - Set session value`);
console.log(`  GET  /api/session/get/:key - Get session value`);
console.log(`\n🔐 Test credentials:`);
console.log(`  alice / password123`);
console.log(`  bob / password456`);
console.log(`\n🧪 Try it with curl:`);
console.log(`  # Login (save cookie)`);
console.log(`  curl -X POST http://localhost:${port}/api/auth/login \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"username":"alice","password":"password123"}' \\`);
console.log(`       -c cookies.txt`);
console.log(``);
console.log(`  # Get current user (use cookie)`);
console.log(`  curl http://localhost:${port}/api/auth/me -b cookies.txt`);
console.log(``);
console.log(`  # Add item to cart`);
console.log(`  curl -X POST http://localhost:${port}/api/cart/add \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"productId":"123","name":"Product","quantity":2}' \\`);
console.log(`       -b cookies.txt`);
console.log(``);
console.log(`  # Get cart`);
console.log(`  curl http://localhost:${port}/api/cart -b cookies.txt`);
console.log(``);
console.log(`  # Logout`);
console.log(`  curl -X POST http://localhost:${port}/api/auth/logout -b cookies.txt`);
