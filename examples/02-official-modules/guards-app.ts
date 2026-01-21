/**
 * Guards 守卫系统示例
 *
 * 本示例演示如何使用守卫系统实现：
 * - 认证守卫 (AuthGuard)
 * - 角色守卫 (RolesGuard)
 * - 自定义守卫
 * - 全局守卫
 *
 * 运行方式：
 * bun run examples/02-official-modules/guards-app.ts
 */

import 'reflect-metadata';
import {
  Application,
  Controller,
  GET,
  POST,
  Body,
  Injectable,
  Module,
  SecurityModule,
  UseGuards,
  Roles,
  AuthGuard,
  RolesGuard,
  SecurityContextHolder,
  type CanActivate,
  type ExecutionContext,
} from '../../packages/bun-server/src';

// ============================================
// 1. 自定义守卫：API Key 守卫
// ============================================

@Injectable()
class ApiKeyGuard implements CanActivate {
  private readonly validApiKeys = ['secret-api-key-123', 'test-api-key-456'];

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.getHeader('x-api-key');

    if (!apiKey || !this.validApiKeys.includes(apiKey)) {
      console.log(`[ApiKeyGuard] Invalid API key: ${apiKey}`);
      return false;
    }

    console.log(`[ApiKeyGuard] Valid API key provided`);
    return true;
  }
}

// ============================================
// 2. 自定义守卫：IP 白名单守卫
// ============================================

@Injectable()
class IpWhitelistGuard implements CanActivate {
  private readonly allowedIps = ['127.0.0.1', 'localhost', '::1', 'unknown'];

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.getClientIp();

    const isAllowed = this.allowedIps.includes(clientIp);
    console.log(`[IpWhitelistGuard] Client IP: ${clientIp}, Allowed: ${isAllowed}`);

    return isAllowed;
  }
}

// ============================================
// 3. 异步守卫：订阅检查守卫
// ============================================

@Injectable()
class SubscriptionGuard implements CanActivate {
  // 模拟订阅数据库
  private readonly subscriptions = new Map<string, { plan: string; active: boolean }>([
    ['user-1', { plan: 'premium', active: true }],
    ['user-2', { plan: 'basic', active: true }],
    ['user-3', { plan: 'premium', active: false }],
  ]);

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const securityContext = SecurityContextHolder.getContext();
    const principal = securityContext.getPrincipal();

    if (!principal) {
      console.log('[SubscriptionGuard] No user authenticated');
      return false;
    }

    // 模拟异步数据库查询
    await new Promise((resolve) => setTimeout(resolve, 50));

    const subscription = this.subscriptions.get(principal.id);
    const hasAccess = subscription?.active && subscription?.plan === 'premium';

    console.log(
      `[SubscriptionGuard] User: ${principal.id}, Plan: ${subscription?.plan}, Active: ${subscription?.active}, Access: ${hasAccess}`,
    );

    return hasAccess ?? false;
  }
}

// ============================================
// 4. 控制器定义
// ============================================

// 公开 API（无守卫）
@Controller('/api/public')
class PublicController {
  @GET('/health')
  public health() {
    return { status: 'ok', message: 'Public endpoint - no guards' };
  }
}

// 需要 API Key 的外部 API
@Controller('/api/external')
@UseGuards(ApiKeyGuard)
class ExternalApiController {
  @GET('/data')
  public getData() {
    return {
      message: 'External API data',
      timestamp: new Date().toISOString(),
    };
  }

  @GET('/protected')
  @UseGuards(IpWhitelistGuard) // 方法级别额外守卫
  public getProtectedData() {
    return {
      message: 'Protected external data (API Key + IP whitelist)',
      secret: 'confidential-info',
    };
  }
}

// 需要认证的用户 API
@Controller('/api/users')
@UseGuards(AuthGuard)
class UserController {
  @GET('/profile')
  public getProfile() {
    const context = SecurityContextHolder.getContext();
    const user = context.getPrincipal();
    return {
      message: 'User profile',
      user,
    };
  }

  @GET('/settings')
  public getSettings() {
    return {
      message: 'User settings',
      settings: { theme: 'dark', language: 'zh' },
    };
  }
}

// 需要认证 + 角色的管理 API
@Controller('/api/admin')
@UseGuards(AuthGuard, RolesGuard)
class AdminController {
  @GET('/dashboard')
  @Roles('admin')
  public dashboard() {
    return {
      message: 'Admin dashboard',
      stats: { users: 100, orders: 50 },
    };
  }

  @GET('/users')
  @Roles('admin', 'moderator') // 任一角色可访问
  public listUsers() {
    return {
      message: 'User list',
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
    };
  }

  @GET('/super')
  @Roles('superadmin')
  public superAdminOnly() {
    return {
      message: 'Super admin only',
      secret: 'top-secret-data',
    };
  }
}

// 需要订阅的高级功能
@Controller('/api/premium')
@UseGuards(AuthGuard, SubscriptionGuard)
class PremiumController {
  @GET('/features')
  public getPremiumFeatures() {
    return {
      message: 'Premium features',
      features: ['Advanced Analytics', 'Priority Support', 'Custom Integrations'],
    };
  }
}

// ============================================
// 5. 模块和应用配置
// ============================================

@Module({
  controllers: [
    PublicController,
    ExternalApiController,
    UserController,
    AdminController,
    PremiumController,
  ],
  providers: [ApiKeyGuard, IpWhitelistGuard, SubscriptionGuard],
})
class AppModule {}

// ============================================
// 6. 启动应用
// ============================================

const app = new Application({ port: 3000 });

// 配置 SecurityModule
app.registerModule(
  SecurityModule.forRoot({
    jwt: {
      secret: 'guards-demo-secret-key',
      accessTokenExpiresIn: 3600,
    },
    excludePaths: ['/api/public'],
    defaultAuthRequired: false,
  }),
);

app.registerModule(AppModule);

// 生成测试用的 JWT token
async function generateTestTokens() {
  const { JWTUtil } = await import('../../packages/bun-server/src/auth/jwt');
  const jwtUtil = new JWTUtil({
    secret: 'guards-demo-secret-key',
    accessTokenExpiresIn: 3600,
  });

  // 普通用户 token
  const userToken = await jwtUtil.generateAccessToken({
    sub: 'user-1',
    username: 'alice',
    roles: ['user'],
  });

  // Admin token
  const adminToken = await jwtUtil.generateAccessToken({
    sub: 'user-1',
    username: 'admin',
    roles: ['admin', 'user'],
  });

  // Super admin token
  const superAdminToken = await jwtUtil.generateAccessToken({
    sub: 'user-1',
    username: 'superadmin',
    roles: ['superadmin', 'admin', 'user'],
  });

  // Moderator token
  const moderatorToken = await jwtUtil.generateAccessToken({
    sub: 'user-2',
    username: 'moderator',
    roles: ['moderator', 'user'],
  });

  return { userToken, adminToken, superAdminToken, moderatorToken };
}

// ============================================
// 7. 打印测试信息
// ============================================

app.listen().then(async () => {
  console.log('\n🚀 Guards Demo Server started at http://localhost:3000\n');

  const tokens = await generateTestTokens();

  console.log('📋 Test Endpoints:\n');

  console.log('1. Public (No guards):');
  console.log('   curl http://localhost:3000/api/public/health\n');

  console.log('2. External API (API Key guard):');
  console.log(
    '   curl -H "x-api-key: secret-api-key-123" http://localhost:3000/api/external/data\n',
  );

  console.log('3. Protected External (API Key + IP whitelist):');
  console.log(
    '   curl -H "x-api-key: secret-api-key-123" http://localhost:3000/api/external/protected\n',
  );

  console.log('4. User Profile (Auth required):');
  console.log(
    `   curl -H "Authorization: Bearer ${tokens.userToken}" http://localhost:3000/api/users/profile\n`,
  );

  console.log('5. Admin Dashboard (Auth + admin role):');
  console.log(
    `   curl -H "Authorization: Bearer ${tokens.adminToken}" http://localhost:3000/api/admin/dashboard\n`,
  );

  console.log('6. Admin Users List (Auth + admin OR moderator role):');
  console.log(
    `   curl -H "Authorization: Bearer ${tokens.moderatorToken}" http://localhost:3000/api/admin/users\n`,
  );

  console.log('7. Super Admin Only (Auth + superadmin role):');
  console.log(
    `   curl -H "Authorization: Bearer ${tokens.superAdminToken}" http://localhost:3000/api/admin/super\n`,
  );

  console.log('8. Premium Features (Auth + active premium subscription):');
  console.log(
    `   curl -H "Authorization: Bearer ${tokens.userToken}" http://localhost:3000/api/premium/features\n`,
  );

  console.log('📝 Test tokens generated for different roles.');
  console.log('   Use the Authorization header with Bearer token to test protected endpoints.\n');
});

