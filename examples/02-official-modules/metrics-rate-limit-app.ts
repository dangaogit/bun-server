/**
 * 速率限制和指标监控示例
 *
 * 演示功能：
 * 1. 速率限制中间件 - 防止 API 滥用
 * 2. 指标监控模块 - Prometheus 指标导出
 * 3. HTTP 请求指标收集 - 自动收集请求延迟和状态码
 */

import {
  Application,
  ConfigModule,
  ConfigService,
  CONFIG_SERVICE_TOKEN,
  Controller,
  createRateLimitMiddleware,
  createHttpMetricsMiddleware,
  GET,
  Inject,
  Injectable,
  MetricsModule,
  MetricsCollector,
  METRICS_SERVICE_TOKEN,
  RateLimit,
  POST,
} from '@dangao/bun-server';

// 配置模块
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: 'Metrics & Rate Limit Demo',
      port: 3000,
    },
  },
});

// 指标监控模块
MetricsModule.forRoot({
  enableHttpMetrics: true,
  customMetrics: [
    {
      name: 'app_active_users',
      type: 'gauge',
      help: 'Number of active users',
      getValue: () => {
        // 模拟获取活跃用户数
        return Math.floor(Math.random() * 100) + 50;
      },
    },
  ],
});

@Injectable()
class ApiService {
  /**
   * 模拟 API 调用
   */
  public async processRequest(data: string): Promise<{ success: boolean; data: string }> {
    // 模拟处理延迟
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    return { success: true, data: `Processed: ${data}` };
  }
}

@Controller('/api')
class ApiController {
  public constructor(
    @Inject(ApiService) private readonly apiService: ApiService,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
    @Inject(METRICS_SERVICE_TOKEN) private readonly metricsCollector: MetricsCollector,
  ) {}

  /**
   * 公开端点 - 无速率限制
   */
  @GET('/public')
  public publicEndpoint() {
    return {
      message: 'This is a public endpoint',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 受限端点 - 使用装饰器应用速率限制
   * 限制：每分钟最多 5 次请求
   */
  @RateLimit({
    max: 5,
    windowMs: 60000, // 1 分钟
    message: 'Too many requests, please try again later',
  })
  @GET('/limited')
  public limitedEndpoint() {
    return {
      message: 'This endpoint has rate limiting (5 requests per minute)',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 严格限制端点 - 更严格的速率限制
   * 限制：每分钟最多 2 次请求
   */
  @RateLimit({
    max: 2,
    windowMs: 60000,
    message: 'Rate limit exceeded for this endpoint',
  })
  @POST('/strict')
  public strictEndpoint() {
    return {
      message: 'This endpoint has strict rate limiting (2 requests per minute)',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 基于 Token 的速率限制示例
   * 注意：实际使用时需要通过中间件配置 keyGenerator
   */
  @GET('/token-based')
  public tokenBasedEndpoint() {
    return {
      message: 'This endpoint would use token-based rate limiting',
      note: 'Configure keyGenerator in middleware to use token-based limiting',
    };
  }

  /**
   * 指标信息端点
   */
  @GET('/metrics-info')
  public async metricsInfo() {
    const dataPoints = await this.metricsCollector.getAllDataPoints();
    return {
      message: 'Metrics are available at /metrics endpoint',
      totalMetrics: dataPoints.length,
      metrics: dataPoints.map((p) => ({
        name: p.name,
        type: p.type,
        value: p.value,
      })),
    };
  }
}

@Controller('/')
class HealthController {
  @GET('/health')
  public health() {
    return { status: 'ok' };
  }

  /**
   * 主页面 - 提供演示界面
   */
  @GET('/')
  public index() {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>速率限制和指标监控演示</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 1.1em;
    }
    .content {
      padding: 30px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.8em;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .endpoint-group {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .endpoint-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      transition: all 0.3s;
    }
    .endpoint-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }
    .endpoint-card h3 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 1.3em;
    }
    .endpoint-card .limit-info {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 15px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1em;
      transition: all 0.3s;
      width: 100%;
      margin-top: 10px;
    }
    .btn:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
    .btn-success {
      background: #48bb78;
    }
    .btn-danger {
      background: #f56565;
    }
    .response {
      margin-top: 15px;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 200px;
      overflow-y: auto;
    }
    .response.success {
      background: #c6f6d5;
      border: 1px solid #48bb78;
      color: #22543d;
    }
    .response.error {
      background: #fed7d7;
      border: 1px solid #f56565;
      color: #742a2a;
    }
    .response.info {
      background: #bee3f8;
      border: 1px solid #4299e1;
      color: #2c5282;
    }
    .metrics-panel {
      background: #f7fafc;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .metric-item {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .metric-item:last-child {
      border-bottom: none;
    }
    .metric-name {
      font-weight: 600;
      color: #2d3748;
    }
    .metric-value {
      color: #667eea;
      font-family: 'Courier New', monospace;
    }
    .rate-limit-info {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      margin-left: 10px;
    }
    .rate-limit-info.remaining {
      background: #c6f6d5;
      color: #22543d;
    }
    .rate-limit-info.limited {
      background: #fed7d7;
      color: #742a2a;
    }
    .refresh-btn {
      background: #48bb78;
      margin-bottom: 15px;
    }
    .links {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
    }
    .links a {
      color: #667eea;
      text-decoration: none;
      margin-right: 20px;
      font-weight: 500;
    }
    .links a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 速率限制和指标监控演示</h1>
      <p>体验 Bun Server Framework 的速率限制和 Prometheus 指标监控功能</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>📡 API 端点测试</h2>
        <div class="endpoint-group">
          <div class="endpoint-card">
            <h3>公开端点</h3>
            <div class="limit-info">无速率限制</div>
            <button class="btn" onclick="testEndpoint('/api/public', 'public-response')">
              发送请求
            </button>
            <div id="public-response" class="response" style="display:none;"></div>
          </div>
          
          <div class="endpoint-card">
            <h3>受限端点</h3>
            <div class="limit-info">限制: 5 次/分钟</div>
            <button class="btn" onclick="testEndpoint('/api/limited', 'limited-response')">
              发送请求
            </button>
            <div id="limited-response" class="response" style="display:none;"></div>
          </div>
          
          <div class="endpoint-card">
            <h3>严格限制端点</h3>
            <div class="limit-info">限制: 2 次/分钟</div>
            <button class="btn btn-danger" onclick="testEndpoint('/api/strict', 'strict-response', 'POST')">
              发送请求 (POST)
            </button>
            <div id="strict-response" class="response" style="display:none;"></div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📊 指标监控</h2>
        <button class="btn refresh-btn" onclick="loadMetrics()">刷新指标</button>
        <div class="metrics-panel" id="metrics-panel">
          <div style="text-align: center; color: #666; padding: 20px;">
            点击"刷新指标"按钮加载指标数据
          </div>
        </div>
      </div>

      <div class="links">
        <a href="/metrics" target="_blank">📈 Prometheus 指标端点</a>
        <a href="/api/metrics-info" target="_blank">📋 指标信息 API</a>
        <a href="/health" target="_blank">❤️ 健康检查</a>
      </div>
    </div>
  </div>

  <script>
    async function testEndpoint(path, responseId, method = 'GET') {
      const responseDiv = document.getElementById(responseId);
      responseDiv.style.display = 'block';
      responseDiv.className = 'response info';
      responseDiv.textContent = '请求中...';

      try {
        const options = {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        const response = await fetch(path, options);
        const data = await response.json();
        
        const rateLimitRemaining = response.headers.get('RateLimit-Remaining');
        const rateLimitLimit = response.headers.get('RateLimit-Limit');
        
        let responseText = JSON.stringify(data, null, 2);
        
        if (rateLimitRemaining !== null) {
          responseText += '\\n\\n速率限制信息:';
          responseText += '\\n  剩余请求数: ' + rateLimitRemaining;
          responseText += '\\n  总限制数: ' + rateLimitLimit;
        }

        responseDiv.className = response.status === 200 ? 'response success' : 'response error';
        responseDiv.textContent = '状态码: ' + response.status + '\\n\\n' + responseText;
      } catch (error) {
        responseDiv.className = 'response error';
        responseDiv.textContent = '错误: ' + error.message;
      }
    }

    async function loadMetrics() {
      const panel = document.getElementById('metrics-panel');
      panel.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">加载中...</div>';

      try {
        const response = await fetch('/api/metrics-info');
        const data = await response.json();
        
        if (data.metrics && data.metrics.length > 0) {
          let html = '<div style="margin-bottom: 15px; font-weight: 600; color: #2d3748;">总指标数: ' + data.totalMetrics + '</div>';
          
          // 按类型分组显示
          const grouped = {};
          data.metrics.forEach(metric => {
            const type = metric.type || 'unknown';
            if (!grouped[type]) {
              grouped[type] = [];
            }
            grouped[type].push(metric);
          });

          Object.keys(grouped).forEach(type => {
            html += '<div style="margin-top: 20px; margin-bottom: 10px; font-weight: 600; color: #667eea; text-transform: uppercase;">' + type + '</div>';
            grouped[type].forEach(metric => {
              html += '<div class="metric-item">';
              html += '<span class="metric-name">' + metric.name + '</span>';
              html += '<span class="metric-value">' + metric.value + '</span>';
              html += '</div>';
            });
          });
          
          panel.innerHTML = html;
        } else {
          panel.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无指标数据</div>';
        }
      } catch (error) {
        panel.innerHTML = '<div style="text-align: center; color: #f56565; padding: 20px;">加载失败: ' + error.message + '</div>';
      }
    }

    // 页面加载时自动加载一次指标
    window.addEventListener('load', () => {
      setTimeout(loadMetrics, 500);
    });
  </script>
</body>
</html>`;
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}

// 创建应用
const port = Number(process.env.PORT) || 3000;
const app = new Application({ port });

// 注册模块
app.registerModule(ConfigModule);
app.registerModule(MetricsModule);

// 注册全局速率限制中间件（可选）
// 这里演示如何为特定路径应用全局速率限制
const globalRateLimit = createRateLimitMiddleware({
  max: 100, // 每分钟最多 100 次请求
  windowMs: 60000,
  keyGenerator: (context) => {
    // 基于 IP 的限流
    return `global:${context.getClientIp()}`;
  },
});

// 只对 /api 路径应用全局速率限制
app.use(async (context, next) => {
  if (context.path.startsWith('/api')) {
    return await globalRateLimit(context, next);
  }
  return await next();
});

// 注册 HTTP 指标收集中间件
const config = app.getContainer().resolve<ConfigService>(CONFIG_SERVICE_TOKEN);
const metricsCollector = app.getContainer().resolve<MetricsCollector>(METRICS_SERVICE_TOKEN);
const httpMetricsMiddleware = createHttpMetricsMiddleware(metricsCollector);
app.use(httpMetricsMiddleware);

// 注册控制器
app.registerController(ApiController);
app.registerController(HealthController);

// 启动服务器
app.listen();

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📊 Metrics endpoint: http://localhost:${port}/metrics`);
console.log(`📖 API endpoints:`);
console.log(`   GET  /api/public          - Public endpoint (no rate limit)`);
console.log(`   GET  /api/limited         - Rate limited (5 req/min)`);
console.log(`   POST /api/strict         - Strict rate limit (2 req/min)`);
console.log(`   GET  /api/token-based     - Token-based rate limit example`);
console.log(`   GET  /api/metrics-info    - View collected metrics`);
console.log(`   GET  /health              - Health check`);
console.log(`\n💡 Try making multiple requests to /api/limited to see rate limiting in action!`);
