# 生产部署指南

本文档介绍将 Bun Server Framework 应用部署到生产环境的最佳实践。框架同时支持 **Bun**（最优性能）和 **Node.js 22+** 运行时，请根据基础设施选择合适的方案。

## 目录

- [前置要求](#前置要求)
- [运行时选择](#运行时选择)
- [环境设置](#环境设置)
- [配置](#配置)
- [进程管理](#进程管理)
- [反向代理](#反向代理)
- [监控](#监控)
- [安全](#安全)
- [扩展](#扩展)

## 前置要求

- **Bun** >= 1.3.10（Bun 部署方案）**或** **Node.js** >= 22.0.0（Node.js 部署方案）
- 生产级数据库（PostgreSQL、MySQL、SQLite 等）
- 反向代理（Nginx、Caddy 等）

## 运行时选择

| 维度 | Bun | Node.js |
|---|---|---|
| 性能 | 最优（原生 API） | 良好 |
| 生态成熟度 | 持续增长 | 成熟 |
| Docker 镜像 | `oven/bun` | `node:22-alpine` |
| `idleTimeout` / `reusePort` | 支持 | 不可用 |
| 推荐场景 | 新项目、延迟敏感型应用 | 已有 Node.js 基础设施 |

框架在启动时自动检测运行时。详见[平台适配指南](./platform.md)。

## 环境设置

### 方案 A — Bun 运行时

```bash
# 安装 Bun（Linux/macOS）
curl -fsSL https://bun.sh/install | bash

# 验证
bun --version
```

### 方案 B — Node.js 运行时

```bash
# 使用 Node.js 22+（LTS）
node --version  # 应为 v22+

# 构建 TypeScript 为 JS
bun build src/main.ts --target=node --outdir=dist
# 或：npx tsc
```

### 设置环境变量

创建 `.env.production` 文件：

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
LOG_LEVEL=info
```

在应用中加载环境变量：

```typescript
import { ConfigModule } from "@dangao/bun-server";

ConfigModule.forRoot({
  load: (env) => ({
    port: Number(env.PORT) || 3000,
    database: {
      url: env.DATABASE_URL,
    },
    jwt: {
      secret: env.JWT_SECRET,
    },
  }),
});
```

## 配置

### 生产配置

```typescript
import { Application } from "@dangao/bun-server";
import { ConfigModule } from "@dangao/bun-server";
import { LoggerModule, LogLevel } from "@dangao/bun-server";

ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: "MyApp",
      port: Number(process.env.PORT) || 3000,
    },
  },
});

LoggerModule.forRoot({
  logger: {
    level: LogLevel.INFO, // 生产环境使用 INFO
    prefix: "App",
  },
  enableRequestLogging: true,
});

const app = new Application({
  port: Number(process.env.PORT) || 3000,
});

// 注册模块并启动
await app.listen();
```

### 错误处理

确保在生产环境中正确配置错误处理：

```typescript
// 全局错误处理器默认已启用
// 如需自定义错误响应
app.use(async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    // 记录错误
    console.error("Request error:", error);

    // 返回适当的错误响应
    if (error instanceof HttpException) {
      return ctx.createResponse(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    // 通用错误
    return ctx.createResponse(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});
```

## 进程管理

### 使用 PM2

安装 PM2：

```bash
npm install -g pm2
```

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: "bun-server-app",
    script: "bun",
    args: "run src/index.ts",
    instances: "max", // 使用所有 CPU 核心
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
  }],
};
```

使用 PM2 启动：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 启用系统重启后自动启动
```

### 使用 systemd

创建 `/etc/systemd/system/bun-server.service`：

```ini
[Unit]
Description=Bun Server Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/bun-server
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
sudo systemctl enable bun-server
sudo systemctl start bun-server
sudo systemctl status bun-server
```

## 反向代理

### Nginx 配置

```nginx
upstream bun_server {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name example.com;

    # 将 HTTP 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://bun_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy 配置

创建 `Caddyfile`：

```
example.com {
    reverse_proxy localhost:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

## 监控

### 健康检查

使用内置的 HealthModule：

```typescript
import { HealthModule } from "@dangao/bun-server";

HealthModule.forRoot({
  indicators: [
    {
      name: "database",
      check: async () => {
        // 检查数据库连接
        await db.query("SELECT 1");
        return { status: "up" };
      },
    },
  ],
});

// 健康检查端点：
// GET /health - 整体健康状态
// GET /ready - 就绪检查
```

### 日志

配置结构化日志：

```typescript
LoggerModule.forRoot({
  logger: {
    level: LogLevel.INFO,
    format: "json", // 生产环境使用 JSON
  },
  enableRequestLogging: true,
});
```

### 指标

使用 MetricsModule 获取应用指标：

```typescript
import { MetricsModule } from "@dangao/bun-server";

MetricsModule.forRoot({
  enableDefaultMetrics: true,
  enableHttpMetrics: true,
});

// 指标端点：GET /metrics
```

## 安全

### HTTPS

在生产环境中始终使用 HTTPS。配置 SSL/TLS 证书（Let's Encrypt 等）。

### 安全头

添加安全中间件：

```typescript
app.use(async (ctx, next) => {
  const response = await next();
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
});
```

### 限流

启用限流：

```typescript
import { createRateLimitMiddleware } from "@dangao/bun-server";

app.use(createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 在 windowMs 内限制 100 个请求
}));
```

### 输入验证

始终验证输入：

```typescript
import { Validate, IsString, IsEmail } from '@dangao/bun-server';

class CreateUserDto {
  @IsString()
  public name!: string;

  @IsEmail()
  public email!: string;
}

@POST('/users')
public createUser(@Body() @Validate() user: CreateUserDto) {
  // 用户已通过验证
}
```

## 扩展

### 水平扩展

在负载均衡器后运行多个实例：

```bash
# 启动多个实例
PORT=3000 bun run src/index.ts &
PORT=3001 bun run src/index.ts &
PORT=3002 bun run src/index.ts &
```

配置负载均衡器（Nginx、HAProxy 等）以分发流量。

### 数据库连接池

配置连接池：

```typescript
DatabaseModule.forRoot({
  database: {
    type: "postgres",
    config: {
      connectionString: process.env.DATABASE_URL,
      max: 20, // 最大池大小
      min: 5, // 最小池大小
    },
  },
});
```

### 缓存

使用 CacheModule 缓存频繁访问的数据：

```typescript
CacheModule.forRoot({
  store: new RedisCacheStore(redisClient),
  defaultTtl: 3600000, // 1 小时
});
```

### 会话存储

使用 Redis 进行分布式会话存储：

```typescript
SessionModule.forRoot({
  store: new RedisSessionStore(redisClient),
  maxAge: 86400000, // 24 小时
});
```

## 检查清单

部署到生产环境前：

- [ ] 环境变量已配置
- [ ] HTTPS 已启用
- [ ] 错误处理已配置
- [ ] 日志已配置
- [ ] 健康检查已启用
- [ ] 限流已启用
- [ ] 安全头已设置
- [ ] 数据库连接池已配置
- [ ] 进程管理器已配置（PM2/systemd）
- [ ] 反向代理已配置
- [ ] 监控已设置
- [ ] 备份策略已就位
