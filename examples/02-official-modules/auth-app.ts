import 'reflect-metadata';

import {
  Application,
  CONFIG_SERVICE_TOKEN,
  ConfigModule,
  ConfigService,
  Controller,
  GET,
  POST,
  Body,
  Query,
  Module,
  SecurityModule,
  Auth,
  Inject,
  Injectable,
  JWT_UTIL_TOKEN,
  ResponseBuilder,
  UnauthorizedException,
  SecurityContextHolder,
  type Container,
  type JWTUtil,
  type UserInfo,
} from '@dangao/bun-server';

/**
 * 用户服务
 */
@Injectable()
class UserService {
  private readonly users = new Map<string, UserInfo>([
    [
      'user-1',
      {
        id: 'user-1',
        username: 'alice',
        roles: ['user', 'admin'],
      },
    ],
    [
      'user-2',
      {
        id: 'user-2',
        username: 'bob',
        roles: ['user'],
      },
    ],
  ]);

  /**
   * 根据 ID 查找用户
   */
  public findById(id: string): Promise<UserInfo | null> {
    return Promise.resolve(this.users.get(id) || null);
  }

  /**
   * 根据用户名查找用户
   */
  public findByUsername(username: string): UserInfo | null {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  /**
   * 验证用户凭据
   */
  public async validateCredentials(
    username: string,
    password: string,
  ): Promise<UserInfo | null> {
    // 简化示例：实际应该验证密码哈希
    const user = this.findByUsername(username);
    if (user && password === 'password') {
      return user;
    }
    return null;
  }
}

/**
 * 用户控制器
 */
@Controller('/api/users')
class UserController {
  public constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(JWT_UTIL_TOKEN) private readonly jwtUtil: JWTUtil,
  ) {}

  /**
   * 登录端点（不需要认证）
   */
  @POST('/login')
  public async login(@Body() body: { username: string; password: string }) {
    const user = await this.userService.validateCredentials(
      body.username,
      body.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 生成访问令牌
    const accessToken = this.jwtUtil.generateAccessToken({
      sub: user.id,
      username: user.username,
      roles: user.roles,
    });

    // 生成刷新令牌
    const refreshToken = this.jwtUtil.generateRefreshToken({
      sub: user.id,
      username: user.username,
      roles: user.roles,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }

  /**
   * 获取当前用户信息（需要认证）
   */
  @GET('/me')
  @Auth()
  public getMe() {
    const securityContext = SecurityContextHolder.getContext();
    const principal = securityContext.getPrincipal();
    const authorities = securityContext.getAuthorities();
    const authentication = securityContext.authentication;

    if (!principal) {
      throw new UnauthorizedException('User not authenticated');
    }

    return {
      id: principal.id,
      username: principal.username,
      roles: authorities,
      authenticated: authentication?.authenticated ?? false,
    };
  }

  /**
   * 获取所有用户（需要管理员权限）
   */
  @GET('/')
  @Auth({ roles: ['admin'] })
  public getAllUsers() {
    return {
      users: [
        { id: 'user-1', username: 'alice' },
        { id: 'user-2', username: 'bob' },
      ],
    };
  }

  /**
   * 公开端点（不需要认证）
   */
  @GET('/public')
  public getPublicInfo() {
    return {
      message: 'This is public information',
    };
  }
}

/**
 * 前端演示页面控制器
 */
@Controller('/')
class FrontendController {
  public constructor(
    @Inject(CONFIG_SERVICE_TOKEN)
    private readonly config: ConfigService,
  ) {}
  /**
   * 首页 - 认证演示页面
   */
  @GET('/')
  public index() {
    const appTitle = this.config.get<string>(
      'app.title',
      'Bun Server 认证演示',
    );
    return ResponseBuilder.html(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .section h2 {
      color: #333;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      color: #555;
      font-size: 14px;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .btn-secondary {
      background: #6c757d;
      margin-top: 10px;
    }
    .btn-secondary:hover {
      box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
    }
    .result {
      margin-top: 15px;
      padding: 12px;
      background: #e7f3ff;
      border-left: 4px solid #2196F3;
      border-radius: 4px;
      font-size: 13px;
      word-break: break-all;
      display: none;
    }
    .result.success {
      background: #e8f5e9;
      border-left-color: #4caf50;
    }
    .result.error {
      background: #ffebee;
      border-left-color: #f44336;
    }
    .result.show {
      display: block;
    }
    .token-display {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      background: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
      word-break: break-all;
    }
    .info {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .info code {
      background: rgba(0, 0, 0, 0.1);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Bun Server 认证演示</h1>
    <p class="subtitle">JWT + OAuth2 完整演示</p>

    <div class="info">
      <strong>测试账号：</strong><br>
      • 用户名: <code>alice</code> 密码: <code>password</code> (角色: user, admin)<br>
      • 用户名: <code>bob</code> 密码: <code>password</code> (角色: user)
    </div>

    <!-- JWT 登录 -->
    <div class="section">
      <h2>1. JWT 登录</h2>
      <form id="loginForm">
        <div class="form-group">
          <label>用户名</label>
          <input type="text" id="username" value="alice" required>
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="password" value="password" required>
        </div>
        <button type="submit">登录</button>
      </form>
      <div class="result" id="loginResult"></div>
    </div>

    <!-- 获取用户信息 -->
    <div class="section">
      <h2>2. 获取当前用户信息</h2>
      <button onclick="getUserInfo()">获取用户信息</button>
      <div class="result" id="userInfoResult"></div>
    </div>

    <!-- 获取所有用户（需要管理员） -->
    <div class="section">
      <h2>3. 获取所有用户（需要管理员权限）</h2>
      <button onclick="getAllUsers()">获取所有用户</button>
      <div class="result" id="allUsersResult"></div>
    </div>

    <!-- OAuth2 授权 -->
    <div class="section">
      <h2>4. OAuth2 授权流程</h2>
      <button onclick="startOAuth2()" class="btn-secondary">启动 OAuth2 授权</button>
      <div class="result" id="oauth2Result"></div>
    </div>
  </div>

  <script>
    let accessToken = null;

    // 登录
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const resultDiv = document.getElementById('loginResult');

      try {
        const response = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (response.ok && data.accessToken) {
          accessToken = data.accessToken;
          resultDiv.className = 'result show success';
          resultDiv.innerHTML = \`
            <strong>登录成功！</strong><br>
            <div class="token-display">Access Token: \${data.accessToken.substring(0, 50)}...</div>
            <div class="token-display">Refresh Token: \${data.refreshToken.substring(0, 50)}...</div>
          \`;
        } else {
          resultDiv.className = 'result show error';
          const errorMessage = data.error || \`HTTP \${response.status}: \${response.statusText}\`;
          resultDiv.innerHTML = \`<strong>登录失败：</strong>\${errorMessage}\`;
        }
      } catch (error) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = \`<strong>错误：</strong>\${error.message}\`;
      }
    });

    // 获取用户信息
    async function getUserInfo() {
      const resultDiv = document.getElementById('userInfoResult');
      if (!accessToken) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<strong>请先登录</strong>';
        return;
      }

      try {
        const response = await fetch('/api/users/me', {
          headers: { 'Authorization': \`Bearer \${accessToken}\` },
        });

        const data = await response.json();
        if (response.ok) {
          resultDiv.className = 'result show success';
          resultDiv.innerHTML = \`<strong>用户信息：</strong><br>\${JSON.stringify(data, null, 2)}\`;
        } else {
          resultDiv.className = 'result show error';
          resultDiv.innerHTML = \`<strong>获取失败：</strong>\${data.error || '未知错误'}\`;
        }
      } catch (error) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = \`<strong>错误：</strong>\${error.message}\`;
      }
    }

    // 获取所有用户
    async function getAllUsers() {
      const resultDiv = document.getElementById('allUsersResult');
      if (!accessToken) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<strong>请先登录</strong>';
        return;
      }

      try {
        const response = await fetch('/api/users', {
          headers: { 'Authorization': \`Bearer \${accessToken}\` },
        });

        const data = await response.json();
        if (response.ok) {
          resultDiv.className = 'result show success';
          resultDiv.innerHTML = \`<strong>所有用户：</strong><br>\${JSON.stringify(data, null, 2)}\`;
        } else {
          resultDiv.className = 'result show error';
          const errorMsg = response.status === 403 
            ? '权限不足（需要管理员角色）' 
            : data.error || \`HTTP \${response.status}\`;
          resultDiv.innerHTML = \`<strong>获取失败：</strong>\${errorMsg}\`;
        }
      } catch (error) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = \`<strong>错误：</strong>\${error.message}\`;
      }
    }

    // OAuth2 授权
    function startOAuth2() {
      const resultDiv = document.getElementById('oauth2Result');
      const clientId = 'my-client';
      const redirectUri = encodeURIComponent(window.location.origin + '/callback');
      const state = Math.random().toString(36).substring(7);
      
      const authUrl = \`/oauth2/authorize?client_id=\${clientId}&redirect_uri=\${redirectUri}&response_type=code&state=\${state}\`;
      
      resultDiv.className = 'result show';
      resultDiv.innerHTML = \`
        <strong>OAuth2 授权流程：</strong><br>
        1. 重定向到授权页面...<br>
        <a href="\${authUrl}" target="_blank" style="color: #667eea; text-decoration: none;">点击打开授权页面</a>
      \`;
      
      // 也可以直接跳转
      // window.location.href = authUrl;
    }
  </script>
</body>
</html>
    `);
  }

  /**
   * OAuth2 回调页面
   */
  @GET('/callback')
  public callback(@Query('code') code?: string, @Query('state') state?: string) {
    return ResponseBuilder.html(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OAuth2 回调</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
    }
    .code {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      word-break: break-all;
      margin: 20px 0;
      font-size: 14px;
    }
    .info {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    button {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 20px;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ OAuth2 授权成功</h1>
    <p class="info">您已获得授权码，可以使用此授权码交换访问令牌</p>
    <div class="code">授权码: ${code || 'N/A'}</div>
    ${state ? `<div class="code">State: ${state}</div>` : ''}
    <button onclick="exchangeToken()">交换访问令牌</button>
    <div id="result" style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 6px; display: none;"></div>
  </div>

  <script>
    async function exchangeToken() {
      const code = '${code}';
      const resultDiv = document.getElementById('result');
      
      try {
        const response = await fetch('/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: 'my-client',
            client_secret: 'my-secret',
            redirect_uri: window.location.origin + '/callback',
          }),
        });

        const data = await response.json();
        resultDiv.style.display = 'block';
        
        if (response.ok) {
          resultDiv.style.background = '#e8f5e9';
          resultDiv.innerHTML = \`
            <strong>✅ 令牌获取成功！</strong><br>
            <div style="margin-top: 10px; font-family: monospace; font-size: 12px; word-break: break-all;">
              Access Token: \${data.accessToken.substring(0, 50)}...<br>
              Refresh Token: \${data.refreshToken ? data.refreshToken.substring(0, 50) + '...' : 'N/A'}<br>
              Expires In: \${data.expiresIn} 秒
            </div>
          \`;
        } else {
          resultDiv.style.background = '#ffebee';
          resultDiv.innerHTML = \`<strong>❌ 错误：</strong>\${data.error || '未知错误'}\`;
        }
      } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.style.background = '#ffebee';
        resultDiv.innerHTML = \`<strong>❌ 错误：</strong>\${error.message}\`;
      }
    }
  </script>
</body>
</html>
    `);
  }
}

// 创建一个容器引用，用于在 userProvider 中访问
let appContainer: Container | null = null;

/**
 * 应用模块
 */
@Module({
  imports: [
    // 配置安全模块（推荐方式）
    SecurityModule.forRoot({
      jwt: {
        secret: 'your-secret-key-change-in-production',
        accessTokenExpiresIn: 3600, // 1 hour
        refreshTokenExpiresIn: 86400 * 7, // 7 days
      },
      oauth2Clients: [
        {
          clientId: 'my-client',
          clientSecret: 'my-secret',
          redirectUris: ['http://localhost:3000/callback'],
          grantTypes: ['authorization_code', 'refresh_token'],
        },
      ],
      enableOAuth2Endpoints: true,
      // 注意：excludePaths 使用前缀匹配
      // '/' 会匹配所有路径，导致认证中间件完全失效，所以需要明确列出排除的路径
      excludePaths: ['/api/users/login', '/api/users/public', '/callback'],
      defaultAuthRequired: false, // 默认不要求认证，通过 @Auth() 装饰器控制
      // userProvider: 从容器中解析 UserService
      // 注意：这里通过闭包捕获 appContainer，在应用启动后才能访问到正确的 UserService 实例
      userProvider: {
        findById: async (userId: string) => {
          if (!appContainer) {
            throw new Error('Application container not initialized');
          }
          const userService = appContainer.resolve<UserService>(UserService);
          return await userService.findById(userId);
        },
      },
    }),
    // 配置 ConfigModule
    ConfigModule.forRoot({
      defaultConfig: {
        app: {
          port: Number(process.env.PORT ?? 3000),
          title: 'Bun Server 认证演示',
        },
      },
    }),
  ],
  controllers: [UserController, FrontendController],
  providers: [UserService],
  exports: [CONFIG_SERVICE_TOKEN], // 重新导出到根容器，以便在模块外部使用
})
class AppModule {}

const app = new Application();
app.registerModule(AppModule);

// 设置容器引用，供 userProvider 使用
appContainer = app.getContainer();

const config = appContainer.resolve<ConfigService>(CONFIG_SERVICE_TOKEN);

const port =
  config.get<number>('app.port', Number(process.env.PORT ?? 3000)) ?? 3000;

app.listen(port);

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`\n📱 前端演示页面:`);
console.log(`   http://localhost:${port}/`);
console.log(`\n📝 Available endpoints:`);
console.log(`  POST /api/users/login - 登录`);
console.log(`  GET  /api/users/me    - 获取当前用户（需要 Bearer token）`);
console.log(`  GET  /api/users/      - 获取所有用户（需要管理员权限）`);
console.log(`\n🔑 OAuth2 端点:`);
console.log(`  GET  /oauth2/authorize - 授权端点`);
console.log(`  POST /oauth2/token     - 令牌端点`);
console.log(`  GET  /oauth2/userinfo  - 用户信息端点`);
console.log(`\n💡 测试账号:`);
console.log(`  alice / password (角色: user, admin)`);
console.log(`  bob / password (角色: user)`);
console.log(`\n🧪 Try it with curl:`);
console.log(`  # 1. 登录获取 token`);
console.log(`  curl -X POST http://localhost:${port}/api/users/login \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"username":"alice","password":"password"}'`);
console.log(``);
console.log(`  # 2. 使用 token 获取用户信息`);
console.log(`  curl http://localhost:${port}/api/users/me \\`);
console.log(`       -H "Authorization: Bearer <your_token>"`);
console.log(``);
console.log(`  # 3. 获取所有用户（需要 admin 权限）`);
console.log(`  curl http://localhost:${port}/api/users/ \\`);
console.log(`       -H "Authorization: Bearer <your_token>"`);

