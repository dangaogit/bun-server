import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import 'reflect-metadata';
import {
  Application,
  SessionModule,
  SessionService,
  SESSION_SERVICE_TOKEN,
  ConfigModule,
  Controller,
  GET,
  POST,
  Inject,
  Injectable,
  Module,
  Param,
  Body,
  Session,
  createSessionMiddleware,
} from '../../src';
import { getTestPort } from '../utils/test-port';

@Injectable()
class AuthService {
  public constructor(
    @Inject(SESSION_SERVICE_TOKEN) private readonly sessionService: SessionService,
  ) {}

  public async login(username: string, sessionId?: string): Promise<{ sessionId: string }> {
    // 如果提供了 sessionId，使用现有 Session，否则创建新 Session
    let session;
    if (sessionId) {
      session = await this.sessionService.get(sessionId);
      if (session) {
        // 更新现有 Session 的数据
        await this.sessionService.set(sessionId, {
          username,
          loginTime: Date.now(),
        });
        session = await this.sessionService.get(sessionId);
      }
    }
    
    if (!session) {
      session = await this.sessionService.create({
        username,
        loginTime: Date.now(),
      });
    }
    
    return { sessionId: session.id };
  }
}

@Controller('/api/auth')
class AuthController {
  public constructor(
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @POST('/login')
  public async login(
    @Body() body: { username: string },
    @Session() session: any,
  ) {
    // 使用中间件创建的 Session（如果存在）
    const sessionId = session?.id;
    return await this.authService.login(body.username, sessionId);
  }
}

@Controller('/api/session')
class SessionController {
  public constructor(
    @Inject(SESSION_SERVICE_TOKEN) private readonly sessionService: SessionService,
  ) {}

  @GET('/info')
  public async getInfo(@Session() session: any) {
    if (!session) {
      return { error: 'No session' };
    }
    return {
      sessionId: session.id,
      username: session.data.username,
    };
  }

  @POST('/set')
  public async setValue(
    @Session() session: any,
    @Body() body: { key: string; value: unknown },
  ) {
    if (!session) {
      return { error: 'No session' };
    }
    await this.sessionService.setValue(session.id, body.key, body.value);
    return { success: true };
  }
}

@Module({
  controllers: [AuthController, SessionController],
  providers: [AuthService],
})
class AppModule {}

describe('Session E2E', () => {
  let app: Application;
  let port: number;

  beforeEach(async () => {
    port = getTestPort();
    ConfigModule.forRoot({
      defaultConfig: { app: { name: 'Session E2E Test', port } },
    });
    SessionModule.forRoot({
      name: 'sessionId',
      maxAge: 86400000,
      rolling: true,
    });
    app = new Application({ port });
    app.registerModule(SessionModule);
    const container = app.getContainer();
    app.use(createSessionMiddleware(container));
    app.registerModule(AppModule);
    await app.listen();
  });

  afterEach(async () => {
    await app.stop();
  });

  test('should create session on login', async () => {
    const response = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessionId).toBeDefined();

    // 检查 Cookie
    const setCookie = response.headers.get('Set-Cookie');
    expect(setCookie).toBeTruthy();
    // Set-Cookie 可能返回字符串或数组
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (cookieStr && typeof cookieStr === 'string') {
      expect(cookieStr.includes('sessionId=')).toBe(true);
    }
  });

  test('should get session info', async () => {
    // 先登录获取 session
    const loginResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser' }),
    });
    const loginData = await loginResponse.json();
    const setCookie = loginResponse.headers.get('Set-Cookie');

    // Set-Cookie 可能返回字符串或数组
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookieStr || typeof cookieStr !== 'string') {
      throw new Error('Set-Cookie header not found');
    }

    // 提取 sessionId=value 部分（第一个分号之前的内容）
    const cookieValue = cookieStr.split(';')[0].trim();

    // 使用 Cookie 访问受保护端点
    const infoResponse = await fetch(`http://localhost:${port}/api/session/info`, {
      headers: {
        Cookie: cookieValue,
      },
    });

    expect(infoResponse.status).toBe(200);
    const infoData = await infoResponse.json();
    expect(infoData.sessionId).toBe(loginData.sessionId);
    expect(infoData.username).toBe('testuser');
  });

  test('should set session value', async () => {
    const loginResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser' }),
    });
    const cookies = loginResponse.headers.get('Set-Cookie') || '';

    const setResponse = await fetch(`http://localhost:${port}/api/session/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies.split(';')[0],
      },
      body: JSON.stringify({ key: 'cart', value: ['item1', 'item2'] }),
    });

    expect(setResponse.status).toBe(200);
    const data = await setResponse.json();
    expect(data.success).toBe(true);
  });
});
