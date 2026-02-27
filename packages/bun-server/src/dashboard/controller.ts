import { RouteRegistry } from '../router/registry';
import type { Context } from '../core/context';
import { createDashboardHTML } from './ui';
import { ControllerRegistry } from '../controller/controller';
import { HEALTH_INDICATORS_TOKEN } from '../health/types';
import type { HealthIndicator } from '../health/types';

/**
 * Dashboard 服务
 * 提供监控 UI 和 API 端点
 */
export class DashboardService {
  private readonly basePath: string;
  private readonly auth?: { username: string; password: string };
  private readonly startTime: number = Date.now();

  /**
   * 创建 Dashboard 服务实例
   * @param basePath - Dashboard 基础路径
   * @param auth - Basic Auth 认证配置（可选）
   */
  public constructor(
    basePath: string,
    auth?: { username: string; password: string },
  ) {
    this.basePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    this.auth = auth;
  }

  /**
   * 注册 Dashboard 路由
   */
  public registerRoutes(): void {
    const registry = RouteRegistry.getInstance();

    registry.register('GET', this.basePath, (ctx) => this.handleDashboard(ctx));
    registry.register(
      'GET',
      `${this.basePath}/api/system`,
      (ctx) => this.handleSystem(ctx),
    );
    registry.register(
      'GET',
      `${this.basePath}/api/routes`,
      (ctx) => this.handleRoutes(ctx),
    );
    registry.register(
      'GET',
      `${this.basePath}/api/health`,
      (ctx) => this.handleHealth(ctx),
    );
    registry.register(
      'POST',
      `${this.basePath}/api/markdown`,
      (ctx) => this.handleMarkdownRender(ctx),
    );
  }

  /**
   * 检查 Basic Auth
   * @param ctx - 请求上下文
   * @returns 是否通过认证，未配置 auth 时返回 true
   */
  private checkAuth(ctx: Context): boolean {
    if (!this.auth) {
      return true;
    }
    const authHeader = ctx.getHeader('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }
    try {
      const decoded = atob(authHeader.slice(6));
      const [username, password] = decoded.split(':');
      return (
        username === this.auth.username && password === this.auth.password
      );
    } catch {
      return false;
    }
  }

  /**
   * 返回 401 Unauthorized 响应
   */
  private unauthorizedResponse(): Response {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Dashboard"',
        'Content-Type': 'text/plain',
      },
    });
  }

  /**
   * 处理 Dashboard 主页面
   */
  private async handleDashboard(ctx: Context): Promise<Response> {
    if (!this.checkAuth(ctx)) {
      return this.unauthorizedResponse();
    }
    const html = createDashboardHTML(this.basePath);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  /**
   * 处理系统信息 API
   */
  private async handleSystem(ctx: Context): Promise<Response> {
    if (!this.checkAuth(ctx)) {
      return this.unauthorizedResponse();
    }
    const mem = process.memoryUsage();
    const data = {
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      platform: process.platform,
      bunVersion: typeof Bun !== 'undefined' ? Bun.version : undefined,
    };
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  /**
   * 处理路由列表 API
   */
  private async handleRoutes(ctx: Context): Promise<Response> {
    if (!this.checkAuth(ctx)) {
      return this.unauthorizedResponse();
    }
    const registry = RouteRegistry.getInstance();
    const router = registry.getRouter();
    const routes = router.getRoutes();
    const data = routes.map((r) => ({
      method: r.method,
      path: r.path,
      controller: r.controllerClass?.name ?? undefined,
      methodName: r.methodName ?? undefined,
    }));
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  /**
   * 将 Markdown 文本渲染为 HTML
   * 利用 Bun 1.3.8+ 内置 Bun.markdown 解析器（Zig 实现，支持 GFM）
   */
  private async handleMarkdownRender(ctx: Context): Promise<Response> {
    if (!this.checkAuth(ctx)) {
      return this.unauthorizedResponse();
    }
    try {
      const body = await ctx.request.json() as { content?: string };
      if (!body.content) {
        return new Response(JSON.stringify({ error: 'content field is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
      const html = Bun.markdown.html(body.content, { headings: true });
      return new Response(JSON.stringify({ html }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  }

  /**
   * 处理健康检查 API
   * 如果 HealthModule 已注册则运行健康指示器，否则返回基本状态
   */
  private async handleHealth(ctx: Context): Promise<Response> {
    if (!this.checkAuth(ctx)) {
      return this.unauthorizedResponse();
    }
    try {
      const container = ControllerRegistry.getInstance().getContainer();
      const indicators = container.resolve<HealthIndicator[]>(
        HEALTH_INDICATORS_TOKEN,
      );
      const details: Record<string, { status: string; details?: unknown }> = {};
      for (const indicator of indicators) {
        try {
          const result = await indicator.check();
          details[indicator.name] = result;
        } catch (err) {
          details[indicator.name] = {
            status: 'down',
            details: { error: (err as Error).message },
          };
        }
      }
      const allUp =
        Object.keys(details).length === 0 ||
        Object.values(details).every((r) => r.status === 'up');
      const data = {
        status: allUp ? 'up' : 'down',
        timestamp: Date.now(),
        details,
      };
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    } catch {
      const data = {
        status: 'up',
        timestamp: Date.now(),
      };
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  }
}
